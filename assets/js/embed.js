/* ─────────────────────────────
   EMBED
   ─────────────────────────────
   Bootstrap for embed.html, the read-only embed viewer: decodes the
   tree from the URL fragment (via tree-share), imports it into the
   model, and wires the zoom controls and branding round-trip link.
   Loads last — tree-edit and app.js are deliberately absent, which
   is what makes the page read-only.
   Also owns the gesture-hint overlay: tree-canvas declines plain
   scrolling in embeds (cooperative gestures) and raises
   fs:gesturehint, which briefly shows how to zoom or pan instead.
   ───────────────────────────── */

(function () {
  var VERSION = '1.4.0';
  var APP_URL = 'https://folder-structure.bydefault.studio/';
  var HINT_HIDE_MS = 1600;

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
    // Share links are full-fidelity: comments always ride along.
    var result = fs().parsers.parse(text, { comments: true });
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
    // Embeds land calm: nothing selected, so nothing fades.
    model.state.focusedId = null;
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

  //
  //------- Gesture hint -------//
  //

  // tree-canvas raises fs:gesturehint when it declines a gesture in
  // favour of the host page's scroll (cooperative gestures). The
  // overlay is transient teaching UI, so it stays aria-hidden and
  // pointer-transparent; repeated triggers just extend its life.
  var hintTimer = null;

  function isApplePlatform() {
    return /Mac|iPhone|iPad|iPod/.test(navigator.platform);
  }

  function showGestureHint(event) {
    var hint = document.querySelector('.embed-gesture-hint');
    if (!hint) { return; }
    var kind = event.detail && event.detail.kind;
    hint.querySelector('.embed-gesture-hint-text').textContent = kind === 'wheel'
      ? 'Use ' + (isApplePlatform() ? '⌘' : 'Ctrl') + ' + scroll to zoom'
      : 'Use two fingers to move';
    hint.classList.add('is-visible');
    if (hintTimer) { clearTimeout(hintTimer); }
    hintTimer = setTimeout(hideGestureHint, HINT_HIDE_MS);
  }

  function hideGestureHint() {
    var hint = document.querySelector('.embed-gesture-hint');
    if (hint) { hint.classList.remove('is-visible'); }
    hintTimer = null;
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
    document.addEventListener('fs:gesturehint', showGestureHint);
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
