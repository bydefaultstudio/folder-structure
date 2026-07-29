/* ─────────────────────────────
   APP
   ─────────────────────────────
   Boot orchestration and chrome wiring: toolbar actions, the import
   and export dialogs (native <dialog>), clipboard copy, and toasts.
   Loads last — every other FolderStructure module is available.
   ───────────────────────────── */

(function () {
  var VERSION = '1.0.0';
  var TOAST_DURATION_MS = 5000;

  var importDialog = null;
  var exportDialog = null;
  var aboutDialog = null;
  var exportFormat = 'unicode-tree';

  function fs() { return window.FolderStructure; }

  //
  //------- Toasts -------//
  //

  function toast(message, options) {
    var container = document.querySelector('.toast-container');
    if (!container) { return; }
    var el = document.createElement('div');
    el.className = 'toast';
    el.setAttribute('role', 'status');

    var text = document.createElement('span');
    text.className = 'toast-message';
    text.textContent = message;
    el.appendChild(text);

    if (options && options.actionLabel) {
      var action = document.createElement('button');
      action.type = 'button';
      action.className = 'button';
      action.setAttribute('data-variant', 'text');
      action.setAttribute('data-size', 'xsmall');
      action.textContent = options.actionLabel;
      action.addEventListener('click', function handleToastAction() {
        options.onAction();
        dismiss();
      });
      el.appendChild(action);
    }

    var timer = setTimeout(dismiss, TOAST_DURATION_MS);
    function dismiss() {
      clearTimeout(timer);
      if (el.parentNode) { el.parentNode.removeChild(el); }
    }
    container.appendChild(el);
  }

  //
  //------- Import -------//
  //

  function updateImportDetection() {
    var textarea = importDialog.querySelector('.import-textarea');
    var hint = importDialog.querySelector('.import-detected');
    var format = fs().parsers.detectFormat(textarea.value);
    var labels = {
      'unicode-tree': 'tree diagram',
      'ascii-tree': 'ASCII tree',
      'markdown-list': 'markdown list',
      'path-list': 'path list',
      'indentation': 'indented list'
    };
    hint.textContent = format ? 'Detected: ' + labels[format] : 'Paste a structure to auto-detect the format';
  }

  function runImport() {
    var textarea = importDialog.querySelector('.import-textarea');
    var error = importDialog.querySelector('.import-error');
    var result = fs().parsers.parse(textarea.value);
    if (!result) {
      error.textContent = 'Couldn’t find a folder structure in that text — try a tree diagram, indented list, or paths.';
      error.classList.remove('is-hidden');
      return;
    }
    error.classList.add('is-hidden');
    var model = fs().model;
    model.state.lastId = 0;
    for (var i = 0; i < result.tree.children.length; i++) {
      model.assignIds(result.tree.children[i]);
    }
    model.replaceTree(result.tree);
    model.state.focusedId = result.tree.children[0] ? result.tree.children[0].id : null;
    importDialog.close();
    textarea.value = '';
    updateImportDetection();
    fs().canvas.fit();
    toast('Imported — ' + countNodes(result.tree) + ' items');
  }

  function countNodes(root) {
    var count = 0;
    function walk(node) {
      count += 1;
      if (node.children) {
        for (var i = 0; i < node.children.length; i++) { walk(node.children[i]); }
      }
    }
    for (var i = 0; i < root.children.length; i++) { walk(root.children[i]); }
    return count;
  }

  //
  //------- Export -------//
  //

  function updateExportPreview() {
    var output = exportDialog.querySelector('.export-output');
    var fence = exportDialog.querySelector('.export-fence').checked;
    output.value = fs().serializers.serialize(fs().model.state.root, exportFormat, { fence: fence });
  }

  function handleExportFormatClick(event) {
    var btn = event.target.closest('.segmented-control-btn');
    if (!btn) { return; }
    exportFormat = btn.getAttribute('data-format');
    var buttons = exportDialog.querySelectorAll('.segmented-control-btn');
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].classList.toggle('is-active', buttons[i] === btn);
      buttons[i].setAttribute('aria-pressed', buttons[i] === btn ? 'true' : 'false');
    }
    updateExportPreview();
  }

  function copyExport() {
    var output = exportDialog.querySelector('.export-output');
    var text = output.value;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(
        function handleCopyOk() { toast('Copied to clipboard'); },
        function handleCopyFail() { fallbackCopy(output); }
      );
    } else {
      fallbackCopy(output);
    }
  }

  function fallbackCopy(output) {
    output.focus();
    output.select();
    try {
      document.execCommand('copy');
      toast('Copied to clipboard');
    } catch (error) {
      toast('Copy failed — select the text and copy manually');
    }
  }

  //
  //------- Toolbar -------//
  //

  function handleToolbarClick(event) {
    var closeBtn = event.target.closest('.dialog-close');
    if (closeBtn) {
      var dialog = closeBtn.closest('dialog');
      if (dialog) { dialog.close(); }
      return;
    }
    var btn = event.target.closest('[data-app-action]');
    if (!btn) { return; }
    var action = btn.getAttribute('data-app-action');
    if (action === 'import') {
      importDialog.showModal();
      updateImportDetection();
    } else if (action === 'export') {
      updateExportPreview();
      exportDialog.showModal();
    } else if (action === 'about') {
      aboutDialog.showModal();
    } else if (action === 'start-fresh') {
      fs().model.startFresh();
      fs().edit.setMode('edit');
      fs().canvas.fit();
    } else if (action === 'undo') {
      fs().model.undo();
    } else if (action === 'redo') {
      fs().model.redo();
    } else if (action === 'fit') {
      fs().canvas.fit();
    } else if (action === 'zoom-in') {
      fs().canvas.zoomIn();
    } else if (action === 'zoom-out') {
      fs().canvas.zoomOut();
    } else if (action === 'zoom-100') {
      fs().canvas.zoomTo100();
    }
  }

  //
  //------- Undo/redo wiring -------//
  //

  function updateHistoryButtons() {
    var undoBtn = document.querySelector('[data-app-action="undo"]');
    var redoBtn = document.querySelector('[data-app-action="redo"]');
    if (undoBtn) { undoBtn.disabled = !fs().model.canUndo(); }
    if (redoBtn) { redoBtn.disabled = !fs().model.canRedo(); }
  }

  function handleHistoryKeydown(event) {
    if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 'z') { return; }
    var target = event.target;
    // Leave native undo alone inside text fields.
    if (target.closest('input, textarea, [contenteditable]')) { return; }
    event.preventDefault();
    if (event.shiftKey) {
      fs().model.redo();
    } else {
      fs().model.undo();
    }
  }

  function handleEditSwitchChange(event) {
    fs().edit.setMode(event.target.checked ? 'edit' : 'view');
  }

  //
  //------- Init -------//
  //

  function initApp() {
    importDialog = document.querySelector('[data-dialog="import"]');
    exportDialog = document.querySelector('[data-dialog="export"]');
    aboutDialog = document.querySelector('[data-dialog="about"]');

    document.addEventListener('click', handleToolbarClick);
    document.addEventListener('keydown', handleHistoryKeydown);
    document.addEventListener('fs:modelchange', updateHistoryButtons);
    document.querySelector('#edit-mode-switch').addEventListener('change', handleEditSwitchChange);
    updateHistoryButtons();
    importDialog.querySelector('.import-textarea').addEventListener('input', updateImportDetection);
    importDialog.querySelector('.import-run').addEventListener('click', runImport);
    exportDialog.querySelector('.export-formats').addEventListener('click', handleExportFormatClick);
    exportDialog.querySelector('.export-fence').addEventListener('change', updateExportPreview);
    exportDialog.querySelector('.export-copy').addEventListener('click', copyExport);

    window.FolderStructure = window.FolderStructure || {};
    window.FolderStructure.app = { toast: toast };

    // Fresh sessions frame the sample; restored sessions keep their view.
    if (!fs().model.restoredFromStorage) {
      fs().canvas.fit();
    }
    console.log('app.js v' + VERSION + ' initialised');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }
})();
