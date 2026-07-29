/* ─────────────────────────────
   TREE MODEL
   ─────────────────────────────
   Single source of truth for the folder-structure tree and view state.
   Pure data + operations, no DOM. Other modules read via
   window.FolderStructure.model and listen for the 'fs:modelchange'
   event (detail: {reason, id}) dispatched after every mutation.
   Persists to localStorage (debounced) on model and view changes;
   falls back to in-memory when storage is unavailable.
   ───────────────────────────── */

(function () {
  var VERSION = '1.0.0';
  var STORAGE_KEY = 'folder-structure:v1';
  var SAVE_DEBOUNCE_MS = 300;

  var state = {
    root: null,           // virtual root: {id:'root', type:'folder', open:true, children:[]}
    lastId: 0,
    view: { x: 0, y: 0, zoom: 1 },
    mode: 'view',         // 'view' | 'edit'
    focusedId: null,
    storageOk: true
  };

  var saveTimer = null;

  // Undo/redo: snapshots of the tree taken before each structural
  // mutation (toggle open/close is deliberately not in history).
  var HISTORY_LIMIT = 100;
  var history = [];
  var future = [];

  function cloneTree(node) {
    return JSON.parse(JSON.stringify(node));
  }

  function snapshot() {
    history.push(cloneTree(state.root));
    if (history.length > HISTORY_LIMIT) { history.shift(); }
    future.length = 0;
  }

  function undo() {
    if (!history.length) { return false; }
    future.push(cloneTree(state.root));
    state.root = history.pop();
    emitChange('undo', 'root');
    return true;
  }

  function redo() {
    if (!future.length) { return false; }
    history.push(cloneTree(state.root));
    state.root = future.pop();
    emitChange('redo', 'root');
    return true;
  }

  //
  //------- Node helpers -------//
  //

  function nextId() {
    state.lastId += 1;
    return 'n' + state.lastId;
  }

  function makeFolder(name, open, children) {
    return { id: nextId(), name: name, type: 'folder', open: !!open, children: children || [] };
  }

  function makeFile(name) {
    return { id: nextId(), name: name, type: 'file' };
  }

  function findNode(id, node) {
    if (!node) { node = state.root; }
    if (node.id === id) { return node; }
    if (!node.children) { return null; }
    for (var i = 0; i < node.children.length; i++) {
      var found = findNode(id, node.children[i]);
      if (found) { return found; }
    }
    return null;
  }

  function findParent(id, node) {
    if (!node) { node = state.root; }
    if (!node.children) { return null; }
    for (var i = 0; i < node.children.length; i++) {
      if (node.children[i].id === id) { return node; }
      var found = findParent(id, node.children[i]);
      if (found) { return found; }
    }
    return null;
  }

  function ancestorIds(id) {
    var ids = [];
    var current = id;
    while (current && current !== 'root') {
      var parent = findParent(current);
      if (!parent) { break; }
      if (parent.id !== 'root') { ids.push(parent.id); }
      current = parent.id;
    }
    return ids;
  }

  // Depth-first walk of visible nodes (children shown only under open folders).
  // callback(node, depth, parent, indexInParent, siblingCount)
  function walkVisible(callback) {
    function walk(node, depth) {
      var children = node.children || [];
      for (var i = 0; i < children.length; i++) {
        var child = children[i];
        callback(child, depth, node, i, children.length);
        if (child.type === 'folder' && child.open) {
          walk(child, depth + 1);
        }
      }
    }
    walk(state.root, 0);
  }

  //
  //------- Mutations -------//
  //

  function emitChange(reason, id) {
    scheduleSave();
    document.dispatchEvent(new CustomEvent('fs:modelchange', { detail: { reason: reason, id: id } }));
  }

  function addChild(parentId, type, name, index) {
    var parent = findNode(parentId);
    if (!parent || parent.type !== 'folder') { return null; }
    snapshot();
    var node = type === 'file' ? makeFile(name) : makeFolder(name, false);
    if (typeof index === 'number') {
      parent.children.splice(index, 0, node);
    } else {
      parent.children.push(node);
    }
    parent.open = true;
    emitChange('add', node.id);
    return node;
  }

  function rename(id, name) {
    var node = findNode(id);
    if (!node) { return false; }
    snapshot();
    node.name = name;
    emitChange('rename', id);
    return true;
  }

  // Removes the node and returns {node, parentId, index} so the caller can undo.
  function remove(id) {
    var parent = findParent(id);
    if (!parent) { return null; }
    for (var i = 0; i < parent.children.length; i++) {
      if (parent.children[i].id === id) {
        snapshot();
        var removed = parent.children.splice(i, 1)[0];
        emitChange('remove', id);
        return { node: removed, parentId: parent.id, index: i };
      }
    }
    return null;
  }

  function move(id, delta) {
    var parent = findParent(id);
    if (!parent) { return false; }
    var from = -1;
    for (var i = 0; i < parent.children.length; i++) {
      if (parent.children[i].id === id) { from = i; break; }
    }
    var to = from + delta;
    if (from < 0 || to < 0 || to >= parent.children.length) { return false; }
    snapshot();
    var node = parent.children.splice(from, 1)[0];
    parent.children.splice(to, 0, node);
    emitChange('move', id);
    return true;
  }

  // Moves the node into the end of its previous sibling folder (outline
  // editor "indent"). Returns false when there is no folder above it.
  function indent(id) {
    var parent = findParent(id);
    if (!parent) { return false; }
    var index = -1;
    for (var i = 0; i < parent.children.length; i++) {
      if (parent.children[i].id === id) { index = i; break; }
    }
    if (index < 1) { return false; }
    var target = parent.children[index - 1];
    if (target.type !== 'folder') { return false; }
    snapshot();
    var node = parent.children.splice(index, 1)[0];
    if (!target.children) { target.children = []; }
    target.children.push(node);
    target.open = true;
    emitChange('indent', id);
    return true;
  }

  // Moves the node out to just after its parent (outline editor "outdent").
  function outdent(id) {
    var parent = findParent(id);
    if (!parent || parent.id === 'root') { return false; }
    var grandparent = findParent(parent.id);
    if (!grandparent) { return false; }
    var index = -1;
    for (var i = 0; i < parent.children.length; i++) {
      if (parent.children[i].id === id) { index = i; break; }
    }
    snapshot();
    var node = parent.children.splice(index, 1)[0];
    for (var g = 0; g < grandparent.children.length; g++) {
      if (grandparent.children[g].id === parent.id) {
        grandparent.children.splice(g + 1, 0, node);
        break;
      }
    }
    emitChange('outdent', id);
    return true;
  }

  function toggle(id) {
    var node = findNode(id);
    if (!node || node.type !== 'folder') { return false; }
    node.open = !node.open;
    emitChange('toggle', id);
    return node.open;
  }

  function replaceTree(newRoot) {
    snapshot();
    state.root = newRoot;
    emitChange('replace', 'root');
  }

  //
  //------- Sample structure -------//
  //

  function assignIds(node) {
    node.id = nextId();
    if (node.children) {
      for (var i = 0; i < node.children.length; i++) { assignIds(node.children[i]); }
    }
    return node;
  }

  function buildSample() {
    var tree = {
      id: 'root', name: 'root', type: 'folder', open: true,
      children: [{
        name: 'my-website', type: 'folder', open: true,
        children: [
          { name: 'index.html', type: 'file' },
          { name: 'about.html', type: 'file' },
          {
            name: 'assets', type: 'folder', open: true,
            children: [
              { name: 'css', type: 'folder', open: false, children: [{ name: 'style.css', type: 'file' }] },
              { name: 'js', type: 'folder', open: false, children: [{ name: 'main.js', type: 'file' }] },
              { name: 'images', type: 'folder', open: false, children: [{ name: 'logo.svg', type: 'file' }] }
            ]
          },
          { name: 'docs', type: 'folder', open: false, children: [{ name: 'README.md', type: 'file' }] }
        ]
      }]
    };
    for (var i = 0; i < tree.children.length; i++) { assignIds(tree.children[i]); }
    return tree;
  }

  // A fresh canvas still starts with example folders and files so the
  // structure of the tool is obvious and there's something to edit.
  function startFresh() {
    snapshot();
    var tree = {
      id: 'root', name: 'root', type: 'folder', open: true,
      children: [{
        name: 'my-project', type: 'folder', open: true,
        children: [
          {
            name: 'first-folder', type: 'folder', open: true,
            children: [
              { name: 'file-one.txt', type: 'file' },
              { name: 'file-two.txt', type: 'file' }
            ]
          },
          { name: 'second-folder', type: 'folder', open: false, children: [] },
          { name: 'read-me.txt', type: 'file' }
        ]
      }]
    };
    for (var i = 0; i < tree.children.length; i++) { assignIds(tree.children[i]); }
    state.root = tree;
    state.view = { x: 0, y: 0, zoom: 1 };
    state.focusedId = tree.children[0].id;
    emitChange('replace', 'root');
  }

  //
  //------- Persistence -------//
  //

  function scheduleSave() {
    if (saveTimer) { clearTimeout(saveTimer); }
    saveTimer = setTimeout(save, SAVE_DEBOUNCE_MS);
  }

  function save() {
    if (!state.storageOk) { return; }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        version: 1,
        tree: state.root,
        view: state.view,
        mode: state.mode,
        focusedId: state.focusedId,
        lastId: state.lastId,
        savedAt: new Date().toISOString()
      }));
    } catch (error) {
      // Quota exceeded or private mode: keep working in memory only.
      state.storageOk = false;
    }
  }

  function load() {
    var payload = null;
    try {
      payload = JSON.parse(localStorage.getItem(STORAGE_KEY));
    } catch (error) {
      state.storageOk = false;
    }
    if (!payload || payload.version !== 1 || !payload.tree ||
        !payload.tree.children || !payload.tree.children.length) {
      return false;
    }
    state.root = payload.tree;
    state.view = payload.view || { x: 0, y: 0, zoom: 1 };
    state.mode = payload.mode === 'edit' ? 'edit' : 'view';
    state.focusedId = payload.focusedId || null;
    state.lastId = payload.lastId || 0;
    return true;
  }

  function notifyViewChange() {
    scheduleSave();
    document.dispatchEvent(new CustomEvent('fs:viewchange'));
  }

  //
  //------- Init -------//
  //

  function initTreeModel() {
    var restored = load();
    if (!restored) {
      state.root = buildSample();
      state.focusedId = state.root.children[0].id;
    }
    window.FolderStructure = window.FolderStructure || {};
    window.FolderStructure.model = {
      state: state,
      restoredFromStorage: restored,
      findNode: findNode,
      findParent: findParent,
      ancestorIds: ancestorIds,
      walkVisible: walkVisible,
      addChild: addChild,
      rename: rename,
      remove: remove,
      move: move,
      indent: indent,
      outdent: outdent,
      toggle: toggle,
      undo: undo,
      redo: redo,
      canUndo: function canUndo() { return history.length > 0; },
      canRedo: function canRedo() { return future.length > 0; },
      replaceTree: replaceTree,
      assignIds: assignIds,
      startFresh: startFresh,
      notifyViewChange: notifyViewChange
    };
    console.log('tree-model.js v' + VERSION + ' initialised');
  }

  initTreeModel();
})();
