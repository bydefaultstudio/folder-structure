/* ─────────────────────────────
   TREE EDIT
   ─────────────────────────────
   Edit mode + all mutating interactions: the add-pill (with its
   folder/file type toggle), inline rename (double-click, pencil
   button, or F2 via tree-keyboard), delete with a one-step Undo
   toast, and move up/down. Edit mode is a state on the app root
   (.is-edit-mode) — view mode hides every editing affordance via
   CSS. All wiring is event delegation on document.
   ───────────────────────────── */

(function () {
  var VERSION = '1.1.0';
  var NAME_FORBIDDEN = /[\/\\─-╿]/g;
  var DS_SPRITE = 'assets/icons/icons.svg';
  var XLINK = 'http://www.w3.org/1999/xlink';

  var addType = 'folder';          // what the add-pill inserts
  var renamingId = null;

  function model() { return window.FolderStructure.model; }

  function toast(message, options) {
    if (window.FolderStructure.app && window.FolderStructure.app.toast) {
      window.FolderStructure.app.toast(message, options);
    }
  }

  //
  //------- Edit mode -------//
  //

  function getMode() {
    return model().state.mode;
  }

  function setMode(mode) {
    model().state.mode = mode;
    document.querySelector('.app').classList.toggle('is-edit-mode', mode === 'edit');
    var switchEl = document.querySelector('#edit-mode-switch');
    if (switchEl) { switchEl.checked = mode === 'edit'; }
    model().notifyViewChange();
  }

  function getAddType() {
    return addType;
  }

  //
  //------- Rename -------//
  //

  // While a row is renaming, its pencil button becomes the check/save
  // button; the same data-action toggles between start and commit.
  function setRenameButton(rowEl, saving, name) {
    if (!rowEl) { return; }
    var button = rowEl.querySelector('[data-action="rename"]');
    if (!button) { return; }
    var use = button.querySelector('use');
    var symbol = saving ? 'check' : 'pencil-draw';
    use.setAttribute('href', DS_SPRITE + '#' + symbol);
    use.setAttributeNS(XLINK, 'xlink:href', DS_SPRITE + '#' + symbol);
    button.setAttribute('aria-label', saving ? 'Save name' : 'Rename ' + name);
    button.setAttribute('data-tooltip', saving ? 'Save name' : 'Rename');
  }

  function startRename(id) {
    if (renamingId) { commitRename(); }
    var rowEl = window.FolderStructure.render.getRowEl(id);
    var node = model().findNode(id);
    if (!rowEl || !node) { return; }
    renamingId = id;
    rowEl.classList.add('is-renaming');
    setRenameButton(rowEl, true, node.name);
    var label = rowEl.querySelector('.tree-label');
    var input = document.createElement('input');
    input.type = 'text';
    input.className = 'tree-rename-input';
    input.value = node.name;
    input.setAttribute('aria-label', 'Rename ' + node.name);
    sizeRenameInput(input);
    input.addEventListener('input', handleRenameInput);
    label.textContent = '';
    label.appendChild(input);
    input.focus();
    input.select();
  }

  // The engine gives text inputs width:100%, which collapses inside the
  // shrink-wrapped label — size explicitly and grow as the user types.
  function sizeRenameInput(input) {
    input.style.width = Math.max(4, input.value.length + 1) + 'ch';
  }

  function handleRenameInput(event) {
    sizeRenameInput(event.target);
  }

  function cleanName(raw) {
    return raw.replace(NAME_FORBIDDEN, '').trim();
  }

  function commitRename() {
    if (!renamingId) { return; }
    var id = renamingId;
    var rowEl = window.FolderStructure.render.getRowEl(id);
    var input = rowEl ? rowEl.querySelector('.tree-rename-input') : null;
    renamingId = null;
    if (!rowEl) { return; }
    if (!input) {                                  // input gone (row re-rendered)
      rowEl.classList.remove('is-renaming');
      var stale = model().findNode(id);
      setRenameButton(rowEl, false, stale ? stale.name : '');
      return;
    }
    var node = model().findNode(id);
    var name = cleanName(input.value);
    rowEl.classList.remove('is-renaming');
    if (input.value !== name && input.value.trim() !== '') {
      toast('Names can’t contain slashes or tree characters');
    }
    if (!name || !node || name === node.name) {
      setRenameButton(rowEl, false, node ? node.name : '');
      window.FolderStructure.render.render();      // restore the label
    } else {
      setRenameButton(rowEl, false, name);
      model().rename(id, name);                    // re-renders via fs:modelchange
    }
    if (rowEl) { rowEl.focus({ preventScroll: true }); }
  }

  function cancelRename() {
    if (!renamingId) { return; }
    var rowEl = window.FolderStructure.render.getRowEl(renamingId);
    var node = model().findNode(renamingId);
    renamingId = null;
    if (rowEl) {
      rowEl.classList.remove('is-renaming');
      setRenameButton(rowEl, false, node ? node.name : '');
    }
    window.FolderStructure.render.render();
    if (rowEl) { rowEl.focus({ preventScroll: true }); }
  }

  //
  //------- Delete / add / move -------//
  //

  function deleteNode(id) {
    var node = model().findNode(id);
    if (!node) { return; }
    var siblingFocus = nextFocusAfterDelete(id);
    if (!model().remove(id)) { return; }
    model().state.focusedId = siblingFocus;
    window.FolderStructure.render.render();
    toast('Deleted “' + node.name + '”', {
      actionLabel: 'Undo',
      onAction: function undoDelete() { model().undo(); }
    });
  }

  function nextFocusAfterDelete(id) {
    var parent = model().findParent(id);
    if (!parent) { return null; }
    var siblings = parent.children;
    for (var i = 0; i < siblings.length; i++) {
      if (siblings[i].id === id) {
        if (siblings[i + 1]) { return siblings[i + 1].id; }
        if (siblings[i - 1]) { return siblings[i - 1].id; }
        return parent.id === 'root' ? null : parent.id;
      }
    }
    return null;
  }

  function addNode(parentId, index) {
    var name = addType === 'file' ? 'new-file.txt' : 'new-folder';
    var node = model().addChild(parentId, addType, name, index);
    if (!node) { return; }
    model().state.focusedId = node.id;
    window.FolderStructure.render.render();
    startRename(node.id);
  }

  //
  //------- Event delegation -------//
  //

  // Reordering re-inserts the row element, which drops DOM focus —
  // put it back on the row so keyboard flow and the chip survive.
  function refocusRow(id) {
    var rowEl = window.FolderStructure.render.getRowEl(id);
    if (rowEl) { rowEl.focus({ preventScroll: true }); }
  }

  function handleDocumentClick(event) {
    var actionBtn = event.target.closest('.tree-item-actions [data-action]');
    if (actionBtn) {
      var rowEl = actionBtn.closest('.tree-item');
      var id = rowEl.getAttribute('data-id');
      var action = actionBtn.getAttribute('data-action');
      if (renamingId && action !== 'rename') { commitRename(); }
      if (action === 'rename') {
        if (renamingId === id) { commitRename(); } else { startRename(id); }
      }
      if (action === 'delete') { deleteNode(id); }
      if (action === 'move-up') { model().move(id, -1); refocusRow(id); }
      if (action === 'move-down') { model().move(id, 1); refocusRow(id); }
      if (action === 'indent') { model().indent(id); refocusRow(id); }
      if (action === 'outdent') { model().outdent(id); refocusRow(id); }
      if (action === 'add-child') {
        var node = model().findNode(id);
        addNode(id, (node.children || []).length);
      }
      return;
    }
    var pillBtn = event.target.closest('.add-pill-btn');
    if (pillBtn) {
      addNode(pillBtn.getAttribute('data-parent-id'), parseInt(pillBtn.getAttribute('data-index'), 10));
      return;
    }
    var typeBtn = event.target.closest('.add-pill-type');
    if (typeBtn) {
      addType = addType === 'folder' ? 'file' : 'folder';
      window.FolderStructure.render.render();      // refresh pill labels/icons
      return;
    }
    if (renamingId && !event.target.closest('.tree-rename-input')) {
      commitRename();
    }
  }

  // Capture-phase: commit before tree-canvas's click handler re-renders
  // (activating another row would otherwise destroy the input and lose
  // the typed name). Chip clicks are excluded — handleDocumentClick
  // owns those so the check button can toggle instead of re-entering.
  function handleOutsideRenameCommit(event) {
    if (!renamingId) { return; }
    if (event.target.closest('.tree-rename-input')) { return; }
    if (event.target.closest('.tree-item-actions')) { return; }
    commitRename();
  }

  function handleDoubleClick(event) {
    if (getMode() !== 'edit') { return; }
    var rowEl = event.target.closest('.tree-item');
    if (!rowEl || event.target.closest('.tree-rename-input')) { return; }
    startRename(rowEl.getAttribute('data-id'));
  }

  function handleRenameKeydown(event) {
    if (!event.target.closest('.tree-rename-input')) { return; }
    if (event.key === 'Enter') {
      event.preventDefault();
      commitRename();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      cancelRename();
    }
    event.stopPropagation();                       // keep tree navigation out of the input
  }

  //
  //------- Init -------//
  //

  function initTreeEdit() {
    document.addEventListener('click', handleOutsideRenameCommit, true);
    document.addEventListener('click', handleDocumentClick);
    document.addEventListener('dblclick', handleDoubleClick);
    document.addEventListener('keydown', handleRenameKeydown, true);

    window.FolderStructure = window.FolderStructure || {};
    window.FolderStructure.edit = {
      getMode: getMode,
      setMode: setMode,
      getAddType: getAddType,
      startRename: startRename,
      deleteNode: deleteNode,
      addNode: addNode,
      isRenaming: function isRenaming() { return renamingId !== null; }
    };

    // Apply persisted mode once the DOM is ready.
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', applySavedMode);
    } else {
      applySavedMode();
    }
    console.log('tree-edit.js v' + VERSION + ' initialised');
  }

  function applySavedMode() {
    setMode(model().state.mode);
  }

  initTreeEdit();
})();
