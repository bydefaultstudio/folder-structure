/* ─────────────────────────────
   TREE KEYBOARD
   ─────────────────────────────
   WAI-ARIA treeview keyboard support with a roving tabindex (the
   focused row is the single tab stop). Navigation works in both
   modes; editing keys (F2, Delete, a) only in edit mode.
     ↑/↓        previous / next visible row
     →          open a closed folder, else first child
     ←          close an open folder, else parent
     Enter/Space  activate (toggle + center — same as click)
     Home/End   first / last visible row
     F2         rename    Delete  delete    a  add inside folder
     Alt+↑/↓    reorder among siblings
     Alt+→/←    indent into the folder above / outdent to the parent
   Rename-input keys are handled (and stopped) by tree-edit.
   ───────────────────────────── */

(function () {
  var VERSION = '1.0.0';

  function model() { return window.FolderStructure.model; }

  function visibleIds() {
    var ids = [];
    model().walkVisible(function collect(node) { ids.push(node.id); });
    return ids;
  }

  function focusRow(id) {
    if (!id) { return; }
    model().state.focusedId = id;
    window.FolderStructure.render.render();
    var el = window.FolderStructure.render.getRowEl(id);
    if (el) { el.focus({ preventScroll: true }); }
    window.FolderStructure.canvas.centerOnNode(id);
  }

  function handleTreeKeydown(event) {
    var rowEl = event.target.closest('.tree-item');
    if (!rowEl || event.target.closest('.tree-rename-input')) { return; }

    var id = rowEl.getAttribute('data-id');
    var node = model().findNode(id);
    if (!node) { return; }
    var ids = visibleIds();
    var index = ids.indexOf(id);
    var editMode = window.FolderStructure.edit.getMode() === 'edit';
    var key = event.key;
    var handled = true;

    if (event.altKey && editMode && (key === 'ArrowRight' || key === 'ArrowLeft' || key === 'ArrowUp' || key === 'ArrowDown')) {
      if (key === 'ArrowRight') { model().indent(id); }
      if (key === 'ArrowLeft') { model().outdent(id); }
      if (key === 'ArrowUp') { model().move(id, -1); }
      if (key === 'ArrowDown') { model().move(id, 1); }
    } else if (key === 'ArrowDown') {
      focusRow(ids[index + 1]);
    } else if (key === 'ArrowUp') {
      focusRow(ids[index - 1]);
    } else if (key === 'ArrowRight') {
      if (node.type === 'folder' && !node.open) {
        model().toggle(id);
      } else if (node.type === 'folder' && node.children && node.children.length) {
        focusRow(node.children[0].id);
      }
    } else if (key === 'ArrowLeft') {
      if (node.type === 'folder' && node.open) {
        model().toggle(id);
      } else {
        var parent = model().findParent(id);
        if (parent && parent.id !== 'root') { focusRow(parent.id); }
      }
    } else if (key === 'Enter' || key === ' ') {
      window.FolderStructure.canvas.activateNode(id);
    } else if (key === 'Home') {
      focusRow(ids[0]);
    } else if (key === 'End') {
      focusRow(ids[ids.length - 1]);
    } else if (key === 'F2' && editMode) {
      window.FolderStructure.edit.startRename(id);
    } else if ((key === 'Delete' || key === 'Backspace') && editMode) {
      window.FolderStructure.edit.deleteNode(id);
    } else if (key === 'a' && editMode && node.type === 'folder') {
      window.FolderStructure.edit.addNode(id, (node.children || []).length);
    } else {
      handled = false;
    }

    if (handled) {
      event.preventDefault();
      event.stopPropagation();
    }
  }

  function initTreeKeyboard() {
    document.addEventListener('keydown', handleTreeKeydown);
    console.log('tree-keyboard.js v' + VERSION + ' initialised');
  }

  initTreeKeyboard();
})();
