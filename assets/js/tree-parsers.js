/* ─────────────────────────────
   TREE PARSERS
   ─────────────────────────────
   Text → tree. Auto-detects and parses the five common notations
   (see docs/tree-notation.md, authoritative): Unicode tree (├── └──),
   ASCII tree (|-- `--), markdown nested list, path list, and plain
   indentation. Pure functions, no DOM; returns a virtual-root tree
   with no ids (tree-model.assignIds runs on import).
   Tolerant by design: CRLF, NBSP, code fences, # comments, heavy/
   rounded box glyphs, tabs, and ragged indents are all normalized.
   ───────────────────────────── */

(function () {
  var VERSION = '1.0.0';

  var BOX_CHARS = /[─-╿]/;
  var ASCII_CONNECTOR = /^\s*(\|\-\-|`\-\-|\\\-\-|\+\-\-)/;
  var MARKDOWN_BULLET = /^(\s*)[-*+]\s+(.+)$/;

  //
  //------- Normalization -------//
  //

  function normalize(text) {
    var lines = String(text)
      .replace(/\u00A0/g, ' ')                    // NBSP -> space
      .split(/\r\n?|\n/);

    // Strip a wrapping markdown code fence if present.
    var kept = [];
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      if (/^\s*```/.test(line)) { continue; }
      // Inline comments: # preceded by whitespace (so "#hashtag" names survive).
      line = line.replace(/\s+#.*$/, '');
      line = line.replace(/\s+$/, '');
      if (line.trim() === '') { continue; }
      // Normalize heavy/rounded box-drawing variants to light forms.
      line = line.replace(/[┃┆┇┊┋]/g, '│').replace(/[┣┠┝]/g, '├')
                 .replace(/[┗┖┕╰]/g, '└').replace(/[━┅┉]/g, '─');
      kept.push(line);
    }
    return kept;
  }

  //
  //------- Detection -------//
  //

  function detectFormat(text) {
    var lines = normalize(text);
    if (!lines.length) { return null; }

    var pathLike = 0;
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      if (BOX_CHARS.test(line)) { return 'unicode-tree'; }
      if (ASCII_CONNECTOR.test(line)) { return 'ascii-tree'; }
      if (/^\S.*\/.+/.test(line)) { pathLike += 1; }
    }
    var markdownish = 0;
    for (i = 0; i < lines.length; i++) {
      if (MARKDOWN_BULLET.test(lines[i])) { markdownish += 1; }
    }
    if (markdownish > lines.length / 2) { return 'markdown-list'; }
    if (pathLike > lines.length / 2) { return 'path-list'; }
    return 'indentation';
  }

  //
  //------- Shared helpers -------//
  //

  function makeRoot() {
    return { id: 'root', name: 'root', type: 'folder', open: true, children: [] };
  }

  function makeNode(rawName) {
    var name = rawName.trim();
    var isFolder = /\/$/.test(name);
    if (isFolder) { name = name.replace(/\/+$/, ''); }
    // No explicit slash: a dot-extension suggests a file, else a folder.
    var type = isFolder ? 'folder' : (/.+\..+/.test(name) ? 'file' : 'folder');
    var node = { name: name, type: type };
    if (type === 'folder') {
      node.open = true;
      node.children = [];
    }
    return node;
  }

  function promoteToFolder(node) {
    if (node.type !== 'folder') {
      node.type = 'folder';
      node.open = true;
    }
    if (!node.children) { node.children = []; }
  }

  // Attaches entries of {depth, name} using a depth stack.
  function buildFromDepthEntries(entries) {
    var root = makeRoot();
    var stack = [{ depth: -1, node: root }];
    for (var i = 0; i < entries.length; i++) {
      var entry = entries[i];
      while (stack.length > 1 && stack[stack.length - 1].depth >= entry.depth) {
        stack.pop();
      }
      var parent = stack[stack.length - 1].node;
      promoteToFolder(parent);
      var node = makeNode(entry.name);
      parent.children.push(node);
      stack.push({ depth: entry.depth, node: node });
    }
    return root;
  }

  //
  //------- Format parsers -------//
  //

  // Unicode + ASCII trees share one algorithm: depth = position of the
  // name start (after the last connector token) divided by 4, tolerant
  // of ragged filler (│, |, spaces in any mix).
  function parseTreeFormat(lines) {
    var entries = [];
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      var match = line.match(/(├──|└──|\|\-\-|`\-\-|\\\-\-|\+\-\-)\s*/g);
      var nameStart = 0;
      if (match) {
        var lastToken = match[match.length - 1];
        nameStart = line.lastIndexOf(lastToken) + lastToken.length;
      }
      var name = line.slice(nameStart).trim();
      if (!name) { continue; }
      var depth;
      if (!match) {
        depth = 0;                                  // root line
      } else {
        depth = Math.round(line.lastIndexOf(match[match.length - 1]) / 4) + 1;
      }
      entries.push({ depth: depth, name: name });
    }
    return buildFromDepthEntries(entries);
  }

  function parseIndentation(lines) {
    var entries = [];
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      var leading = line.match(/^[\t ]*/)[0];
      var width = leading.replace(/\t/g, '    ').length;
      entries.push({ depth: width, name: line.trim() });
    }
    return buildFromDepthEntries(entries);
  }

  function parseMarkdownList(lines) {
    var entries = [];
    for (var i = 0; i < lines.length; i++) {
      var match = lines[i].match(MARKDOWN_BULLET);
      if (!match) { continue; }
      var width = match[1].replace(/\t/g, '    ').length;
      entries.push({ depth: width, name: match[2] });
    }
    return buildFromDepthEntries(entries);
  }

  function parsePathList(lines) {
    var root = makeRoot();
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();
      var endsWithSlash = /\/$/.test(line);
      var segments = line.replace(/^\/+|\/+$/g, '').split('/');
      var parent = root;
      for (var s = 0; s < segments.length; s++) {
        var segment = segments[s].trim();
        if (!segment) { continue; }
        var isLast = s === segments.length - 1;
        promoteToFolder(parent);
        var existing = null;
        for (var c = 0; c < parent.children.length; c++) {
          if (parent.children[c].name === segment) { existing = parent.children[c]; break; }
        }
        if (!existing) {
          existing = makeNode(isLast && !endsWithSlash ? segment : segment + '/');
          parent.children.push(existing);
        }
        if (!isLast) { promoteToFolder(existing); }
        parent = existing;
      }
    }
    return root;
  }

  //
  //------- Entry point -------//
  //

  // Returns {format, tree} or null when nothing parseable was found.
  function parse(text) {
    var format = detectFormat(text);
    if (!format) { return null; }
    var lines = normalize(text);
    var tree;
    if (format === 'unicode-tree' || format === 'ascii-tree') {
      tree = parseTreeFormat(lines);
    } else if (format === 'markdown-list') {
      tree = parseMarkdownList(lines);
    } else if (format === 'path-list') {
      tree = parsePathList(lines);
    } else {
      tree = parseIndentation(lines);
    }
    if (!tree.children.length) { return null; }
    return { format: format, tree: tree };
  }

  //
  //------- Init -------//
  //

  function initTreeParsers() {
    window.FolderStructure = window.FolderStructure || {};
    window.FolderStructure.parsers = {
      detectFormat: detectFormat,
      parse: parse
    };
    console.log('tree-parsers.js v' + VERSION + ' initialised');
  }

  initTreeParsers();
})();
