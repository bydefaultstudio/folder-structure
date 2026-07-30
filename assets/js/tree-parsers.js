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
   Inline `# comments` are always captured during normalization but
   only attached to nodes when parse() is called with {comments:true};
   the default strips them, matching historical behavior.
   ───────────────────────────── */

(function () {
  var VERSION = '1.1.0';

  var BOX_CHARS = /[─-╿]/;
  var ASCII_CONNECTOR = /^\s*(\|\-\-|`\-\-|\\\-\-|\+\-\-)/;
  var MARKDOWN_BULLET = /^(\s*)[-*+]\s+(.+)$/;
  // # preceded by whitespace (so "#hashtag" names survive); first match wins.
  var INLINE_COMMENT = /\s+#\s?(.*)$/;

  //
  //------- Normalization -------//
  //

  // Returns [{text, comment}] — comment-stripped line text plus the
  // captured comment ('' when none). Detection and all parsers consume
  // entry.text, so comment content never skews format heuristics.
  function normalizeEntries(text) {
    var lines = String(text)
      .replace(/\u00A0/g, ' ')                    // NBSP -> space
      .split(/\r\n?|\n/);

    // Strip a wrapping markdown code fence if present.
    var entries = [];
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      if (/^\s*```/.test(line)) { continue; }
      var comment = '';
      var match = line.match(INLINE_COMMENT);
      if (match) {
        comment = match[1].trim();
        line = line.slice(0, match.index);
      }
      line = line.replace(/\s+$/, '');
      if (line.trim() === '') { continue; }        // full-line comments drop too
      // Normalize heavy/rounded box-drawing variants to light forms.
      line = line.replace(/[┃┆┇┊┋]/g, '│').replace(/[┣┠┝]/g, '├')
                 .replace(/[┗┖┕╰]/g, '└').replace(/[━┅┉]/g, '─');
      entries.push({ text: line, comment: comment });
    }
    return entries;
  }

  //
  //------- Detection -------//
  //

  function detectFromEntries(entries) {
    if (!entries.length) { return null; }

    var pathLike = 0;
    for (var i = 0; i < entries.length; i++) {
      var line = entries[i].text;
      if (BOX_CHARS.test(line)) { return 'unicode-tree'; }
      if (ASCII_CONNECTOR.test(line)) { return 'ascii-tree'; }
      if (/^\S.*\/.+/.test(line)) { pathLike += 1; }
    }
    var markdownish = 0;
    for (i = 0; i < entries.length; i++) {
      if (MARKDOWN_BULLET.test(entries[i].text)) { markdownish += 1; }
    }
    if (markdownish > entries.length / 2) { return 'markdown-list'; }
    if (pathLike > entries.length / 2) { return 'path-list'; }
    return 'indentation';
  }

  function detectFormat(text) {
    return detectFromEntries(normalizeEntries(text));
  }

  function containsComments(text) {
    var entries = normalizeEntries(text);
    for (var i = 0; i < entries.length; i++) {
      if (entries[i].comment) { return true; }
    }
    return false;
  }

  //
  //------- Shared helpers -------//
  //

  function makeRoot() {
    return { id: 'root', name: 'root', type: 'folder', open: true, children: [] };
  }

  function makeNode(rawName, comment) {
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
    if (comment) { node.comment = comment; }
    return node;
  }

  function promoteToFolder(node) {
    if (node.type !== 'folder') {
      node.type = 'folder';
      node.open = true;
    }
    if (!node.children) { node.children = []; }
  }

  function stripComments(node) {
    delete node.comment;
    if (node.children) {
      for (var i = 0; i < node.children.length; i++) {
        stripComments(node.children[i]);
      }
    }
  }

  // Attaches entries of {depth, name, comment} using a depth stack.
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
      var node = makeNode(entry.name, entry.comment);
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
  function parseTreeFormat(entries) {
    var depthEntries = [];
    for (var i = 0; i < entries.length; i++) {
      var line = entries[i].text;
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
      depthEntries.push({ depth: depth, name: name, comment: entries[i].comment });
    }
    return buildFromDepthEntries(depthEntries);
  }

  function parseIndentation(entries) {
    var depthEntries = [];
    for (var i = 0; i < entries.length; i++) {
      var line = entries[i].text;
      var leading = line.match(/^[\t ]*/)[0];
      var width = leading.replace(/\t/g, '    ').length;
      depthEntries.push({ depth: width, name: line.trim(), comment: entries[i].comment });
    }
    return buildFromDepthEntries(depthEntries);
  }

  function parseMarkdownList(entries) {
    var depthEntries = [];
    for (var i = 0; i < entries.length; i++) {
      var match = entries[i].text.match(MARKDOWN_BULLET);
      if (!match) { continue; }
      var width = match[1].replace(/\t/g, '    ').length;
      depthEntries.push({ depth: width, name: match[2], comment: entries[i].comment });
    }
    return buildFromDepthEntries(depthEntries);
  }

  function parsePathList(entries) {
    var root = makeRoot();
    for (var i = 0; i < entries.length; i++) {
      var line = entries[i].text.trim();
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
      // The line's comment belongs to its last segment; non-empty wins on dedupe.
      if (entries[i].comment && parent !== root) {
        parent.comment = entries[i].comment;
      }
    }
    return root;
  }

  //
  //------- Entry point -------//
  //

  // Returns {format, tree} or null when nothing parseable was found.
  // options: {comments: boolean} — attach captured # comments to nodes.
  function parse(text, options) {
    var entries = normalizeEntries(text);
    var format = detectFromEntries(entries);
    if (!format) { return null; }
    var tree;
    if (format === 'unicode-tree' || format === 'ascii-tree') {
      tree = parseTreeFormat(entries);
    } else if (format === 'markdown-list') {
      tree = parseMarkdownList(entries);
    } else if (format === 'path-list') {
      tree = parsePathList(entries);
    } else {
      tree = parseIndentation(entries);
    }
    if (!tree.children.length) { return null; }
    if (!(options && options.comments)) { stripComments(tree); }
    return { format: format, tree: tree };
  }

  //
  //------- Init -------//
  //

  function initTreeParsers() {
    window.FolderStructure = window.FolderStructure || {};
    window.FolderStructure.parsers = {
      detectFormat: detectFormat,
      containsComments: containsComments,
      parse: parse
    };
    console.log('tree-parsers.js v' + VERSION + ' initialised');
  }

  initTreeParsers();
})();
