/* ─────────────────────────────
   APP
   ─────────────────────────────
   Boot orchestration and chrome wiring: toolbar actions, dialog
   content refresh (open/close is the design system's dialog.js via
   data-dialog-open/close), clipboard copy, toasts, and share-link
   import from the URL fragment (see tree-share.js).
   Loads last — every other FolderStructure module is available.
   ───────────────────────────── */

(function () {
  var VERSION = '1.7.0';
  var TOAST_DURATION_MS = 5000;
  // Hard-coded https: the subdomain serves plain http without a
  // redirect, and an http embed URL is mixed content inside Notion.
  var EMBED_BASE_URL = 'https://folder-structure.bydefault.studio/embed';
  var URL_LENGTH_WARN = 2000;

  var importDialog = null;
  var exportDialog = null;
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
    // The keep-comments row doubles as the "comments detected" notice —
    // it only appears when the paste actually contains # comments. It is
    // checked by default: a pasted comment is content the user wrote, so
    // keeping it is the safe reading and discarding is the opt-in.
    var commentsRow = importDialog.querySelector('.import-comments-row');
    commentsRow.classList.toggle('is-hidden', !fs().parsers.containsComments(textarea.value));
  }

  function runImport() {
    var textarea = importDialog.querySelector('.import-textarea');
    var error = importDialog.querySelector('.import-error');
    var keepComments = importDialog.querySelector('.import-comments');
    var result = fs().parsers.parse(textarea.value, { comments: keepComments.checked });
    if (!result) {
      error.textContent = 'Couldn’t find a folder structure in that text — try a tree diagram, indented list, or paths.';
      error.classList.remove('is-hidden');
      return;
    }
    error.classList.add('is-hidden');
    applyImportedTree(result.tree);
    importDialog.close();
    textarea.value = '';
    keepComments.checked = true;                   // keeping comments is the default each time
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
    // Imports land calm: nothing selected, so nothing fades.
    model.state.focusedId = null;
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
        // Share links are full-fidelity: comments always ride along.
        var parsed = fs().parsers.parse(result.text, { comments: true });
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
    var comments = exportDialog.querySelector('.export-comments').checked;
    output.value = fs().serializers.serialize(fs().model.state.root, exportFormat, { fence: fence, comments: comments });
  }

  function treeHasComments() {
    function walk(node) {
      if (node.comment) { return true; }
      if (node.children) {
        for (var i = 0; i < node.children.length; i++) {
          if (walk(node.children[i])) { return true; }
        }
      }
      return false;
    }
    return walk(fs().model.state.root);
  }

  function toggleExportControls() {
    var isEmbed = exportFormat === 'embed';
    exportDialog.querySelector('.export-fence-row').classList.toggle('is-hidden', isEmbed);
    // Only offer the comments toggle when there are comments to include
    // (embed links always carry them, so the toggle is moot there too).
    exportDialog.querySelector('.export-comments-row').classList.toggle('is-hidden', isEmbed || !treeHasComments());
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
    // Share links are full-fidelity: comments always ride along.
    var text = fs().serializers.serialize(fs().model.state.root, 'unicode-tree', { fence: false, comments: true });
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
    copyText(output.value, 'Copied to clipboard', output);
  }

  function copyPrompt() {
    copyText(fs().prompt.TEXT, 'Prompt copied — paste it into any AI chat', null);
  }

  // sourceEl is the on-screen field already holding this text, or null
  // when nothing shows it; the fallback needs something selectable.
  function copyText(text, okMessage, sourceEl) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(
        function handleCopyOk() { toast(okMessage); },
        function handleCopyFail() { fallbackCopy(text, okMessage, sourceEl); }
      );
    } else {
      fallbackCopy(text, okMessage, sourceEl);
    }
  }

  // execCommand needs a focused selection, so text with no field of its
  // own borrows a throwaway one. Appending and removing it inside this
  // one task means it is never painted, but focus has to be handed back.
  function fallbackCopy(text, okMessage, sourceEl) {
    var field = sourceEl;
    var previous = document.activeElement;
    if (!field) {
      field = document.createElement('textarea');
      field.value = text;
      field.setAttribute('readonly', '');
      document.body.appendChild(field);
    }
    field.focus();
    field.select();
    try {
      document.execCommand('copy');
      toast(okMessage);
    } catch (error) {
      toast('Copy failed — select the text and copy manually');
    }
    if (field !== sourceEl) {
      document.body.removeChild(field);
      if (previous && previous.focus) { previous.focus(); }
    }
  }

  //
  //------- Toolbar -------//
  //

  // Opening and closing is the design system's dialog.js (declarative
  // data-dialog-open/close on the same buttons); these branches only
  // refresh the dialog's content for the state it opens onto.
  function handleToolbarClick(event) {
    var btn = event.target.closest('[data-app-action]');
    if (!btn) { return; }
    var action = btn.getAttribute('data-app-action');
    if (action === 'import') {
      updateImportDetection();
    } else if (action === 'export') {
      updateExportPreview();
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
      fs().canvas.fit();
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
    importDialog = document.getElementById('import-dialog');
    exportDialog = document.getElementById('export-dialog');

    document.addEventListener('click', handleToolbarClick);
    document.addEventListener('keydown', handleHistoryKeydown);
    document.addEventListener('fs:modelchange', updateHistoryButtons);
    document.addEventListener('fs:modelchange', updateToggleAllButton);
    document.querySelector('#edit-mode-switch').addEventListener('change', handleEditSwitchChange);
    updateHistoryButtons();
    updateToggleAllButton();
    importDialog.querySelector('.import-textarea').addEventListener('input', updateImportDetection);
    importDialog.querySelector('.import-run').addEventListener('click', runImport);
    importDialog.querySelector('.import-copy-prompt').addEventListener('click', copyPrompt);
    exportDialog.querySelector('.export-formats').addEventListener('click', handleExportFormatClick);
    exportDialog.querySelector('.export-fence').addEventListener('change', updateExportPreview);
    exportDialog.querySelector('.export-comments').addEventListener('change', updateExportPreview);
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
