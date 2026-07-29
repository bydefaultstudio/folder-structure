/* ─────────────────────────────
   APP
   ─────────────────────────────
   Boot orchestration and chrome wiring: toolbar actions, the import
   and export dialogs (native <dialog>), clipboard copy, toasts, and
   share-link import from the URL fragment (see tree-share.js).
   Loads last — every other FolderStructure module is available.
   ───────────────────────────── */

(function () {
  var VERSION = '1.2.0';
  var TOAST_DURATION_MS = 5000;
  // Hard-coded https: the subdomain serves plain http without a
  // redirect, and an http embed URL is mixed content inside Notion.
  var EMBED_BASE_URL = 'https://folder-structure.bydefault.studio/embed';
  var URL_LENGTH_WARN = 2000;

  var importDialog = null;
  var exportDialog = null;
  var aboutDialog = null;
  var exportFormat = 'unicode-tree';
  // Bumped on every preview refresh so a slow async embed encode can
  // never overwrite the output of a later format selection.
  var exportPreviewToken = 0;

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
    applyImportedTree(result.tree);
    importDialog.close();
    textarea.value = '';
    updateImportDetection();
    fs().canvas.fit();
    toast('Imported — ' + countNodes(result.tree) + ' items');
  }

  function applyImportedTree(tree) {
    var model = fs().model;
    model.state.lastId = 0;
    for (var i = 0; i < tree.children.length; i++) {
      model.assignIds(tree.children[i]);
    }
    model.replaceTree(tree);
    model.state.focusedId = tree.children[0] ? tree.children[0].id : null;
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
  //------- Share links -------//
  //

  function importFromFragment() {
    if (!fs().share.parseFragment(location.hash)) { return; }
    fs().share.decodeFragment(location.hash).then(
      function handleShared(result) {
        clearFragment();
        if (!result) { return; }
        var parsed = fs().parsers.parse(result.text);
        if (!parsed) {
          toast('Couldn’t read the shared link');
          return;
        }
        applyImportedTree(parsed.tree);
        fs().canvas.fit();
        toast('Loaded shared structure — ' + countNodes(parsed.tree) + ' items', {
          actionLabel: 'Undo',
          onAction: undoSharedImport
        });
      },
      function handleSharedFail() {
        clearFragment();
        toast('Couldn’t read the shared link');
      }
    );
  }

  function undoSharedImport() {
    fs().model.undo();
  }

  // Clear the fragment so reloads and copied URLs don't re-import.
  function clearFragment() {
    history.replaceState(null, '', location.pathname + location.search);
  }

  //
  //------- Export -------//
  //

  function updateExportPreview() {
    exportPreviewToken += 1;
    toggleExportControls();
    var output = exportDialog.querySelector('.export-output');
    output.placeholder = '';
    if (exportFormat === 'embed') {
      updateEmbedPreview(exportPreviewToken);
      return;
    }
    var fence = exportDialog.querySelector('.export-fence').checked;
    output.value = fs().serializers.serialize(fs().model.state.root, exportFormat, { fence: fence });
  }

  function toggleExportControls() {
    var isEmbed = exportFormat === 'embed';
    exportDialog.querySelector('.export-fence-row').classList.toggle('is-hidden', isEmbed);
    exportDialog.querySelector('.export-embed-url-row').classList.toggle('is-hidden', !isEmbed);
    if (!isEmbed) {
      exportDialog.querySelector('.export-embed-warning').classList.add('is-hidden');
    }
  }

  function showEmbedWarning(message) {
    var warning = exportDialog.querySelector('.export-embed-warning');
    warning.textContent = message;
    warning.classList.remove('is-hidden');
  }

  function updateEmbedPreview(token) {
    var output = exportDialog.querySelector('.export-output');
    var urlOnly = exportDialog.querySelector('.export-embed-url').checked;
    output.value = '';
    if (!fs().model.state.root.children.length) {
      showEmbedWarning('Your structure is empty — add folders or files before embedding.');
      return;
    }
    output.placeholder = 'Generating link…';
    var text = fs().serializers.serialize(fs().model.state.root, 'unicode-tree', { fence: false });
    fs().share.encodeTree(text).then(
      function handleEncoded(payload) {
        if (token !== exportPreviewToken) { return; }
        var url = EMBED_BASE_URL + '#t=' + payload;
        output.placeholder = '';
        output.value = urlOnly ? url : buildIframeSnippet(url);
        if (url.length > URL_LENGTH_WARN) {
          showEmbedWarning('This link is ' + url.length + ' characters. Browsers and iframes handle it fine, but some tools truncate URLs over ~2,000 characters.');
        } else {
          exportDialog.querySelector('.export-embed-warning').classList.add('is-hidden');
        }
      },
      function handleEncodeFail() {
        if (token !== exportPreviewToken) { return; }
        output.placeholder = '';
        showEmbedWarning('Couldn’t generate an embed link in this browser.');
      }
    );
  }

  function buildIframeSnippet(url) {
    return '<iframe src="' + url + '" width="100%" height="480" style="border:0" loading="lazy" title="Folder structure diagram"></iframe>';
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
    } else if (action === 'toggle-all') {
      fs().model.setAllOpen(!fs().model.allNestedOpen());
    } else if (action === 'zoom-in') {
      fs().canvas.zoomIn();
    } else if (action === 'zoom-out') {
      fs().canvas.zoomOut();
    } else if (action === 'zoom-100') {
      fs().canvas.zoomTo100();
    }
  }

  // The expand/collapse-all button previews the result of clicking:
  // open-folder icon = "expand all" until every nested folder is open,
  // then closed-folder icon = "collapse all".
  function updateToggleAllButton() {
    var btn = document.querySelector('[data-app-action="toggle-all"]');
    if (!btn) { return; }
    var expanded = fs().model.allNestedOpen();
    var symbol = expanded ? 'folder' : 'folder-open';
    var label = expanded ? 'Collapse all folders' : 'Expand all folders';
    btn.setAttribute('aria-label', label);
    btn.setAttribute('data-tooltip', expanded ? 'Collapse all' : 'Expand all');
    var icon = btn.querySelector('.svg-icn');
    icon.setAttribute('data-icon', symbol);
    icon.querySelector('use').setAttribute('href', 'assets/icons/project-icons.svg#' + symbol);
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
    document.addEventListener('fs:modelchange', updateToggleAllButton);
    document.querySelector('#edit-mode-switch').addEventListener('change', handleEditSwitchChange);
    updateHistoryButtons();
    updateToggleAllButton();
    importDialog.querySelector('.import-textarea').addEventListener('input', updateImportDetection);
    importDialog.querySelector('.import-run').addEventListener('click', runImport);
    exportDialog.querySelector('.export-formats').addEventListener('click', handleExportFormatClick);
    exportDialog.querySelector('.export-fence').addEventListener('change', updateExportPreview);
    exportDialog.querySelector('.export-embed-url').addEventListener('change', updateExportPreview);
    exportDialog.querySelector('.export-copy').addEventListener('click', copyExport);

    window.FolderStructure = window.FolderStructure || {};
    window.FolderStructure.app = { toast: toast };

    // Fresh sessions frame the sample; restored sessions keep their view.
    if (!fs().model.restoredFromStorage) {
      fs().canvas.fit();
    }
    importFromFragment();
    console.log('app.js v' + VERSION + ' initialised');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }
})();
