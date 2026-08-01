/* ─────────────────────────────
   TREE EDIT
   ─────────────────────────────
   Edit mode + all mutating interactions: the add-pill (with its
   folder/file type toggle), inline rename (pencil button or F2 via
   tree-keyboard — not double-click, which rows reserve for
   select-then-toggle), comment pills (the pill's own chat/edit +
   delete toolbar, double-click on the comment, or C via
   tree-keyboard — the pill is the single comment control), delete
   with a one-step Undo toast, move up/down, and folder ⇄ file
   conversion (the chip's swap button or T). Deleting a folder
   that holds anything raises a dialog first: delete the whole branch,
   or keep the contents and promote them one level (model.unwrap).
   Files and empty folders skip it. Converting a folder that holds
   anything asks the same question for the same reason — a file has
   nowhere to put them — and both dialogs share their wording.
   Edit mode is a state
   on the app root (.is-edit-mode) — view mode hides every editing
   affordance via CSS. All wiring is event delegation on document.
   At most one inline input (rename or comment) is open at a time.
   ───────────────────────────── */

(function () {
  var VERSION = '1.7.0';
  var NAME_FORBIDDEN = /[\/\\─-╿]/g;
  // Comments allow slashes and #; newlines and tree glyphs would break
  // the `name  # comment` line notation.
  var COMMENT_FORBIDDEN = /[\r\n─-╿]/g;
  var COMMENT_MAX_LENGTH = 80;
  var SPRITE = 'assets/icons/project-icons.svg';
  var DS_SPRITE = 'assets/icons/icons.svg';
  var XLINK = 'http://www.w3.org/1999/xlink';

  var addType = 'folder';          // what the add-pill inserts
  var renamingId = null;
  var commentingId = null;
  var pendingDeleteId = null;      // folder awaiting a delete-dialog choice
  var pendingConvertId = null;     // folder awaiting a convert-dialog choice

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
  //------- Shared inline-input helpers -------//
  //

  // The engine gives text inputs width:100%, which collapses inside the
  // shrink-wrapped label — size explicitly and grow as the user types.
  // border-box means padding and border eat into a bare ch width and
  // crop the last letters, so add them back; an empty input sizes to
  // its placeholder. ch measures the '0' glyph, which under-sizes wide
  // letters in a proportional font, so widen to the real content width
  // whenever the estimate still overflows.
  function sizeInlineInput(input) {
    var chars = Math.max(
      4,
      input.value.length + 1,
      input.value ? 0 : (input.placeholder ? input.placeholder.length + 1 : 0)
    );
    input.style.width = 'calc(' + chars + 'ch + 2 * var(--space-2xs) + 2 * var(--border-s))';
    if (input.scrollWidth > input.clientWidth) {
      var borders = input.offsetWidth - input.clientWidth;
      input.style.width = (input.scrollWidth + borders + 8) + 'px';
    }
  }

  function handleInlineInputGrow(event) {
    sizeInlineInput(event.target);
  }

  function swapButtonIcon(button, sprite, symbol) {
    var use = button.querySelector('use');
    use.setAttribute('href', sprite + '#' + symbol);
    use.setAttributeNS(XLINK, 'xlink:href', sprite + '#' + symbol);
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
    if (saving) {
      swapButtonIcon(button, DS_SPRITE, 'check');
    } else {
      swapButtonIcon(button, SPRITE, 'pencil');
    }
    button.setAttribute('aria-label', saving ? 'Save name' : 'Rename ' + name);
    button.setAttribute('data-tooltip', saving ? 'Save name' : 'Rename');
  }

  function startRename(id) {
    if (renamingId) { commitRename(); }
    if (commentingId) { commitComment(); }
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
    sizeInlineInput(input);
    input.addEventListener('input', handleInlineInputGrow);
    label.textContent = '';
    label.appendChild(input);
    input.focus();
    input.select();
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
  //------- Comment -------//
  //

  // Mirrors the rename flow: the pill's chat button becomes check/save
  // while the input is open, and its data-action toggles start/commit.
  function setCommentButton(rowEl, saving, node) {
    if (!rowEl) { return; }
    var button = rowEl.querySelector('[data-action="comment-edit"]');
    if (!button) { return; }
    var name = node ? node.name : '';
    var hasComment = !!(node && node.comment);
    if (saving) {
      swapButtonIcon(button, DS_SPRITE, 'check');
    } else {
      swapButtonIcon(button, DS_SPRITE, 'chat');
    }
    button.setAttribute('aria-label', saving
      ? 'Save comment'
      : (hasComment ? 'Edit comment on ' : 'Add comment to ') + name);
    button.setAttribute('data-tooltip', saving
      ? 'Save comment'
      : (hasComment ? 'Edit comment' : 'Add comment'));
  }

  function startComment(id) {
    if (renamingId) { commitRename(); }
    if (commentingId) { commitComment(); }
    var rowEl = window.FolderStructure.render.getRowEl(id);
    var node = model().findNode(id);
    if (!rowEl || !node) { return; }
    commentingId = id;
    rowEl.classList.add('is-commenting');
    setCommentButton(rowEl, true, node);
    var commentEl = rowEl.querySelector('.tree-comment');
    var input = document.createElement('input');
    input.type = 'text';
    input.className = 'tree-comment-input';
    input.value = node.comment || '';
    input.maxLength = COMMENT_MAX_LENGTH;
    input.placeholder = 'Add a comment';
    input.setAttribute('aria-label', 'Comment on ' + node.name);
    sizeInlineInput(input);
    input.addEventListener('input', handleInlineInputGrow);
    commentEl.textContent = '';
    commentEl.appendChild(input);
    input.focus();
    input.select();
  }

  function cleanComment(raw) {
    return raw.replace(COMMENT_FORBIDDEN, '').trim();
  }

  function commitComment() {
    if (!commentingId) { return; }
    var id = commentingId;
    var rowEl = window.FolderStructure.render.getRowEl(id);
    var input = rowEl ? rowEl.querySelector('.tree-comment-input') : null;
    commentingId = null;
    if (!rowEl) { return; }
    var node = model().findNode(id);
    if (!input) {                                  // input gone (row re-rendered)
      rowEl.classList.remove('is-commenting');
      setCommentButton(rowEl, false, node);
      return;
    }
    var comment = cleanComment(input.value);
    rowEl.classList.remove('is-commenting');
    // The render diff can't see an input inside an empty-vs-empty span,
    // so take the input out explicitly before restoring.
    if (input.parentNode) { input.parentNode.removeChild(input); }
    if (input.value !== comment && input.value.trim() !== '') {
      toast('Comments can’t contain tree characters');
    }
    if (!node || comment === (node.comment || '')) {
      setCommentButton(rowEl, false, node);
      window.FolderStructure.render.render();      // restore the comment text
    } else {
      setCommentButton(rowEl, false, node);
      model().setComment(id, comment);             // re-renders via fs:modelchange
    }
    if (rowEl) { rowEl.focus({ preventScroll: true }); }
  }

  function cancelComment() {
    if (!commentingId) { return; }
    var rowEl = window.FolderStructure.render.getRowEl(commentingId);
    var node = model().findNode(commentingId);
    commentingId = null;
    if (rowEl) {
      rowEl.classList.remove('is-commenting');
      // Same explicit removal as commitComment — the render diff misses
      // an input sitting in an empty-vs-empty comment span.
      var input = rowEl.querySelector('.tree-comment-input');
      if (input) { input.parentNode.removeChild(input); }
      setCommentButton(rowEl, false, node);
    }
    window.FolderStructure.render.render();
    if (rowEl) { rowEl.focus({ preventScroll: true }); }
  }

  function deleteComment(id) {
    if (commentingId === id) { cancelComment(); }  // deleting, not saving
    var node = model().findNode(id);
    if (!node || !node.comment) { return; }
    model().setComment(id, '');
    toast('Comment deleted', {
      actionLabel: 'Undo',
      onAction: function undoCommentDelete() { model().undo(); }
    });
    refocusRow(id);
  }

  //
  //------- Delete / add / move -------//
  //

  // Deleting a folder that holds something asks first, because the two
  // reasonable intentions — drop the whole branch, or drop just this
  // level and keep what was inside — cannot be inferred from the click.
  // Files and empty folders have no such ambiguity and go straight
  // through.
  function deleteNode(id) {
    var node = model().findNode(id);
    if (!node) { return; }
    var total = model().countDescendants(node);
    if (node.type !== 'folder' || total === 0) {
      removeBranch(id);
      return;
    }
    openDeleteDialog(id, node, total);
  }

  function removeBranch(id) {
    var node = model().findNode(id);
    if (!node) { return; }
    var total = model().countDescendants(node);
    var siblingFocus = nextFocusAfterDelete(id);
    if (!model().remove(id)) { return; }
    model().state.focusedId = siblingFocus;
    window.FolderStructure.render.render();
    if (siblingFocus) { refocusRow(siblingFocus); }
    toast('Deleted “' + node.name + '”' + (total ? ' and ' + countLabel(total) + ' inside' : ''), {
      actionLabel: 'Undo',
      onAction: function undoDelete() { model().undo(); }
    });
  }

  function removeLevel(id) {
    var node = model().findNode(id);
    if (!node) { return; }
    var kept = (node.children || []).length;
    var siblingFocus = nextFocusAfterDelete(id);
    var result = model().unwrap(id);
    if (!result) { return; }
    // Land on the first promoted child — it now occupies the folder's
    // old slot, so focus stays where the user was looking.
    model().state.focusedId = result.keptIds[0] || siblingFocus;
    window.FolderStructure.render.render();
    if (model().state.focusedId) { refocusRow(model().state.focusedId); }
    toast('Removed “' + node.name + '”, kept ' + countLabel(kept), {
      actionLabel: 'Undo',
      onAction: function undoRemoveLevel() { model().undo(); }
    });
  }

  function countLabel(n) {
    return n + (n === 1 ? ' item' : ' items');
  }

  // Both dialogs offer the same "keep what was inside" choice and owe
  // the user the same warning: only the direct children move up, and
  // deeper nesting rides along attached to them.
  function keepContentsDetail(total, direct) {
    return total === direct
      ? 'Keeping them moves all ' + countLabel(direct) + ' up one level.'
      : 'Keeping them moves the ' + countLabel(direct) + ' directly inside up one level; anything nested deeper stays attached to those.';
  }

  //
  //------- Delete confirmation dialog -------//
  //

  function openDeleteDialog(id, node, total) {
    var dialog = document.querySelector('#delete-folder-dialog');
    // No opener element exists for this one — it is raised by a keypress
    // or a chip button that the delete itself destroys — so it calls
    // showModal() directly rather than going through the design system's
    // declarative data-dialog-open path.
    if (!dialog) { removeBranch(id); return; }
    var direct = (node.children || []).length;

    dialog.querySelector('#delete-folder-title').textContent = 'Delete “' + node.name + '”?';
    dialog.querySelector('.delete-folder-summary').textContent =
      'It holds ' + countLabel(total) + '.';
    dialog.querySelector('.delete-folder-detail').textContent = keepContentsDetail(total, direct);
    dialog.querySelector('.delete-folder-all').textContent = 'Delete all ' + countLabel(total);

    pendingDeleteId = id;
    if (!dialog.open) { dialog.showModal(); }
  }

  function handleDeleteDialogClick(event) {
    var id = pendingDeleteId;
    if (!id) { return; }
    // close() fires its close event on a queued task, so pendingDeleteId
    // survives a tick past dismissal. Gate on the dialog itself, which is
    // accurate the moment it shuts.
    var dialog = document.querySelector('#delete-folder-dialog');
    if (!dialog || !dialog.open) { return; }
    if (event.target.closest('.delete-folder-all')) {
      closeDeleteDialog();
      removeBranch(id);
    } else if (event.target.closest('.delete-folder-keep')) {
      closeDeleteDialog();
      removeLevel(id);
    }
  }

  function closeDeleteDialog() {
    var dialog = document.querySelector('#delete-folder-dialog');
    pendingDeleteId = null;
    if (dialog && dialog.open) { dialog.close(); }
  }

  // Escape and backdrop dismissal never reach the buttons — clear the
  // pending id so a later stray click can't act on a stale node.
  function handleDeleteDialogClose() {
    pendingDeleteId = null;
    if (model().state.focusedId) { refocusRow(model().state.focusedId); }
  }

  //
  //------- Change type -------//
  //

  // Folder ⇄ file. A file, or a folder with nothing in it, converts
  // straight through. A folder that holds something raises the same
  // question deleting one does — keep the contents or drop them — so
  // it asks before the type changes.
  function convertNode(id) {
    var node = model().findNode(id);
    if (!node) { return; }
    if (node.type === 'file') {
      applyConvert(id, 'folder');
      return;
    }
    var total = model().countDescendants(node);
    if (total === 0) {
      applyConvert(id, 'file');
      return;
    }
    openConvertDialog(id, node, total);
  }

  function applyConvert(id, type, contents) {
    var node = model().findNode(id);
    if (!node) { return; }
    var kept = contents === 'keep' ? (node.children || []).length : 0;
    var dropped = contents === 'discard' ? model().countDescendants(node) : 0;
    if (!model().setType(id, type, contents)) { return; }
    window.FolderStructure.render.render();
    refocusRow(id);
    var detail = '';
    if (kept) { detail = ', kept ' + countLabel(kept); }
    if (dropped) { detail = ' and deleted ' + countLabel(dropped); }
    toast('Changed “' + node.name + '” to a ' + type + detail, {
      actionLabel: 'Undo',
      onAction: function undoConvert() { model().undo(); }
    });
  }

  function openConvertDialog(id, node, total) {
    var dialog = document.querySelector('#convert-type-dialog');
    // Same reasoning as the delete dialog: no opener element survives
    // the action, so this calls showModal() directly rather than going
    // through the design system's declarative data-dialog-open path.
    if (!dialog) { applyConvert(id, 'file', 'keep'); return; }
    var direct = (node.children || []).length;

    dialog.querySelector('#convert-type-title').textContent = 'Change “' + node.name + '” to a file?';
    dialog.querySelector('.convert-type-summary').textContent =
      'A file cannot hold anything, and “' + node.name + '” holds ' + countLabel(total) + '.';
    dialog.querySelector('.convert-type-detail').textContent = keepContentsDetail(total, direct);
    dialog.querySelector('.convert-type-discard').textContent = 'Delete all ' + countLabel(total);

    pendingConvertId = id;
    if (!dialog.open) { dialog.showModal(); }
  }

  function handleConvertDialogClick(event) {
    var id = pendingConvertId;
    if (!id) { return; }
    // Gate on the dialog, not the pending id — close() fires its close
    // event on a queued task, so the id outlives dismissal by a tick.
    var dialog = document.querySelector('#convert-type-dialog');
    if (!dialog || !dialog.open) { return; }
    if (event.target.closest('.convert-type-keep')) {
      closeConvertDialog();
      applyConvert(id, 'file', 'keep');
    } else if (event.target.closest('.convert-type-discard')) {
      closeConvertDialog();
      applyConvert(id, 'file', 'discard');
    }
  }

  function closeConvertDialog() {
    var dialog = document.querySelector('#convert-type-dialog');
    pendingConvertId = null;
    if (dialog && dialog.open) { dialog.close(); }
  }

  function handleConvertDialogClose() {
    pendingConvertId = null;
    if (model().state.focusedId) { refocusRow(model().state.focusedId); }
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
    var actionBtn = event.target.closest('.tree-item-overlays [data-action]');
    if (actionBtn) {
      var rowEl = actionBtn.closest('.tree-item');
      var id = rowEl.getAttribute('data-id');
      var action = actionBtn.getAttribute('data-action');
      if (renamingId && action !== 'rename') { commitRename(); }
      if (commentingId && action !== 'comment-edit' && action !== 'comment-delete') { commitComment(); }
      if (action === 'rename') {
        if (renamingId === id) { commitRename(); } else { startRename(id); }
      }
      if (action === 'comment-edit') {
        if (commentingId === id) { commitComment(); } else { startComment(id); }
      }
      if (action === 'comment-delete') { deleteComment(id); }
      if (action === 'delete') { deleteNode(id); }
      if (action === 'convert') { convertNode(id); }
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
    if (commentingId && !event.target.closest('.tree-comment-input')) {
      commitComment();
    }
  }

  // Capture-phase: commit before tree-canvas's click handler re-renders
  // (activating another row would otherwise destroy the input and lose
  // the typed text). Overlay-rail clicks (chip + pill) are excluded —
  // handleDocumentClick owns those so the check buttons can toggle
  // instead of re-entering.
  function handleOutsideEditCommit(event) {
    if (!renamingId && !commentingId) { return; }
    if (event.target.closest('.tree-rename-input, .tree-comment-input')) { return; }
    if (event.target.closest('.tree-item-overlays')) { return; }
    // Read the target row before committing — commits re-render.
    var rowEl = event.target.closest('.tree-item');
    var clickedId = rowEl ? rowEl.getAttribute('data-id') : null;
    var editingId = renamingId || commentingId;   // only ever one at a time
    commitRename();
    commitComment();
    // Dismissing an inline input is the whole job of that click; letting
    // it fall through would also toggle the row it just committed on.
    if (clickedId && clickedId === editingId) { event.stopPropagation(); }
  }

  // Double-click belongs to the comment pill only. Rows deliberately do
  // not answer it: a row's two clicks mean select-then-toggle (see
  // tree-canvas activateNode), and dblclick fires alongside those two
  // clicks, so binding rename here would make a fast open/close
  // ambiguous with a rename. Rename lives on the chip's pencil and F2.
  function handleDoubleClick(event) {
    if (getMode() !== 'edit') { return; }
    if (event.target.closest('.tree-rename-input, .tree-comment-input')) { return; }
    var commentEl = event.target.closest('.tree-comment');
    if (!commentEl) { return; }
    var rowEl = commentEl.closest('.tree-item');
    if (rowEl) { startComment(rowEl.getAttribute('data-id')); }
  }

  function handleInlineEditKeydown(event) {
    var inRename = event.target.closest('.tree-rename-input');
    var inComment = event.target.closest('.tree-comment-input');
    if (!inRename && !inComment) { return; }
    if (event.key === 'Enter') {
      event.preventDefault();
      if (inRename) { commitRename(); } else { commitComment(); }
    } else if (event.key === 'Escape') {
      event.preventDefault();
      if (inRename) { cancelRename(); } else { cancelComment(); }
    }
    event.stopPropagation();                       // keep tree navigation out of the input
  }

  //
  //------- Init -------//
  //

  function initTreeEdit() {
    document.addEventListener('click', handleOutsideEditCommit, true);
    document.addEventListener('click', handleDocumentClick);
    document.addEventListener('click', handleDeleteDialogClick);
    document.addEventListener('click', handleConvertDialogClick);
    document.addEventListener('dblclick', handleDoubleClick);
    document.addEventListener('keydown', handleInlineEditKeydown, true);

    window.FolderStructure = window.FolderStructure || {};
    window.FolderStructure.edit = {
      getMode: getMode,
      setMode: setMode,
      getAddType: getAddType,
      startRename: startRename,
      startComment: startComment,
      deleteNode: deleteNode,
      convertNode: convertNode,
      addNode: addNode,
      isRenaming: function isRenaming() { return renamingId !== null; },
      isCommenting: function isCommenting() { return commentingId !== null; }
    };

    // Apply persisted mode and bind the dialogs once the DOM is ready —
    // both need elements this script may load ahead of.
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initDomBindings);
    } else {
      initDomBindings();
    }
    console.log('tree-edit.js v' + VERSION + ' initialised');
  }

  function initDomBindings() {
    setMode(model().state.mode);
    var deleteDialog = document.querySelector('#delete-folder-dialog');
    if (deleteDialog) { deleteDialog.addEventListener('close', handleDeleteDialogClose); }
    var convertDialog = document.querySelector('#convert-type-dialog');
    if (convertDialog) { convertDialog.addEventListener('close', handleConvertDialogClose); }
  }

  initTreeEdit();
})();
