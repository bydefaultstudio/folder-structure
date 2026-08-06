/* ─────────────────────────────
   TREE FILE ICONS
   ─────────────────────────────
   Filename in, design-system symbol id out. Owns the extension →
   symbol table, the matching rules and the generic fallback; the
   renderer owns sprite paths and everything DOM. Every id returned
   here lives in assets/icons/icons.svg — new ids must be added to
   icons.manifest.json or they vanish on deploy (the manifest is the
   sole input to the sprite build; nothing scans usage).
   Data only: no DOM, no behaviour.
   ───────────────────────────── */

(function () {
  var VERSION = '1.0.0';

  // One entry per symbol, extensions lowercase. Formats without a
  // dedicated mark fall back to the generic 'file' — never stretch a
  // mark beyond what its glyph honestly depicts (agreed 2026-08-06:
  // svg rides with the image mark, pdf with the document mark, log
  // with the text mark; code, configs, archives and design files wait
  // for their own icons).
  var TABLE = {
    'file-md': ['md', 'mdx', 'markdown'],
    'file-html': ['html', 'htm'],
    'file-json': ['json', 'jsonc'],
    'file-css': ['css', 'scss', 'sass', 'less'],
    'file-img': ['png', 'jpg', 'jpeg', 'gif', 'webp', 'avif', 'heic', 'tif', 'tiff', 'bmp', 'ico', 'svg'],
    'file-video': ['mp4', 'mov', 'webm', 'avi', 'mkv', 'm4v'],
    'file-audio': ['mp3', 'wav', 'aiff', 'aif', 'm4a', 'flac', 'ogg'],
    'file-font': ['woff', 'woff2', 'ttf', 'otf', 'eot'],
    'file-txt': ['txt', 'rtf', 'log'],
    'file-doc': ['doc', 'docx', 'pages', 'pdf']
  };

  var FALLBACK = 'file';

  var symbolByExtension = buildLookup(TABLE);

  function buildLookup(table) {
    var lookup = {};
    Object.keys(table).forEach(function (symbol) {
      table[symbol].forEach(function (extension) {
        lookup[extension] = symbol;
      });
    });
    return lookup;
  }

  // Extension = segment after the LAST dot, and only when that dot has
  // characters on both sides — so '.gitignore', 'README' and trailing-
  // dot names have no extension. Compound names resolve by the same
  // rule: 'app.min.js' → 'js', 'archive.tar.gz' → 'gz'.
  function extensionOf(name) {
    var lowered = String(name).toLowerCase();
    var dot = lowered.lastIndexOf('.');
    if (dot <= 0 || dot === lowered.length - 1) { return ''; }
    return lowered.slice(dot + 1);
  }

  function symbolFor(name) {
    return symbolByExtension[extensionOf(name)] || FALLBACK;
  }

  function initTreeFileIcons() {
    window.FolderStructure = window.FolderStructure || {};
    window.FolderStructure.fileIcons = { symbolFor: symbolFor };
    console.log('tree-file-icons.js v' + VERSION + ' initialised');
  }

  initTreeFileIcons();
})();
