/* ─────────────────────────────
   EMBED
   ─────────────────────────────
   Bootstrap for embed.html, the read-only embed viewer: decodes the
   tree from the URL fragment (via tree-share), imports it into the
   model, and wires the zoom controls and branding round-trip link.
   Loads last — tree-edit and app.js are deliberately absent, which
   is what makes the page read-only.
   ───────────────────────────── */

(function () {
  var VERSION = '1.1.0';
  var APP_URL = 'https://folder-structure.bydefault.studio/';

  function fs() { return window.FolderStructure; }

  //
  //------- Fragment loading -------//
  //

  function loadFromFragment() {
    fs().share.decodeFragment(location.hash).then(
      function handleDecoded(result) {
        if (!result) {
          showError('This embed link has no structure data.');
          return;
        }
        importText(result.text);
      },
      function handleDecodeFail() {
        showError('This embed link looks damaged or is from a newer version.');
      }
    );
  }

  function importText(text) {
    var result = fs().parsers.parse(text);
    if (!result) {
      showError('Couldn’t read the structure in this link.');
      return;
    }
    var model = fs().model;
    model.state.lastId = 0;
    for (var i = 0; i < result.tree.children.length; i++) {
      model.assignIds(result.tree.children[i]);
    }
    model.replaceTree(result.tree);
    model.state.focusedId = result.tree.children[0] ? result.tree.children[0].id : null;
    fs().canvas.fit();
    hideError();
  }

  //
  //------- Error state -------//
  //

  function showError(message) {
    var error = document.querySelector('.embed-error');
    error.querySelector('.embed-error-message').textContent = message;
    error.classList.remove('is-hidden');
  }

  function hideError() {
    document.querySelector('.embed-error').classList.add('is-hidden');
  }

  //
  //------- Chrome wiring -------//
  //

  function handleZoomClick(event) {
    var btn = event.target.closest('[data-app-action]');
    if (!btn) { return; }
    var action = btn.getAttribute('data-app-action');
    if (action === 'fit') {
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

  // Mirrors app.js: the expand/collapse-all button previews the result
  // of clicking (open-folder icon = expand all, closed = collapse all).
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

  function updateBrandingLink() {
    var link = document.querySelector('.embed-branding');
    if (link) { link.href = APP_URL + location.hash; }
  }

  function applyFragmentTheme() {
    var parsed = fs().share.parseFragment(location.hash);
    if (parsed && parsed.theme) {
      document.documentElement.setAttribute('data-theme', parsed.theme);
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }

  function handleHashChange() {
    applyFragmentTheme();
    updateBrandingLink();
    loadFromFragment();
  }

  function handleFontsReady() {
    // The tree re-renders once fonts land; re-fit so framing matches.
    if (fs().model.state.root.children.length) { fs().canvas.fit(); }
  }

  //
  //------- Init -------//
  //

  function initEmbed() {
    document.addEventListener('click', handleZoomClick);
    document.addEventListener('fs:modelchange', updateToggleAllButton);
    window.addEventListener('hashchange', handleHashChange);
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(handleFontsReady);
    }
    updateBrandingLink();
    updateToggleAllButton();
    loadFromFragment();
    console.log('embed.js v' + VERSION + ' initialised');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initEmbed);
  } else {
    initEmbed();
  }
})();
