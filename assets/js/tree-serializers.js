/* ─────────────────────────────
   TREE SERIALIZERS
   ─────────────────────────────
   Tree → text in the four export notations (docs/tree-notation.md is
   authoritative): Unicode tree (default, AI-ready), ASCII tree,
   markdown nested list, and path list. Folders always get a trailing
   slash. Optional wrap in a ```text fence; optional `  # comment`
   suffixes ({comments:true}). Pure functions, no DOM.
   Round-trip property: parsers.parse(serialize(tree, f)) reproduces
   the same structure for every format — including comments when both
   sides opt in.
   ───────────────────────────── */

(function () {
  var VERSION = '1.1.0';

  // [branch, lastBranch, passThrough, blank]
  var GLYPHS = {
    'unicode-tree': ['├── ', '└── ', '│   ', '    '],
    'ascii-tree': ['|-- ', '`-- ', '|   ', '    ']
  };

  function displayName(node) {
    return node.type === 'folder' ? node.name + '/' : node.name;
  }

  // Two spaces before # per docs/tree-notation.md; '' when disabled or unset.
  function commentSuffix(node, withComments) {
    return withComments && node.comment ? '  # ' + node.comment : '';
  }

  //
  //------- Formats -------//
  //

  function serializeTreeFormat(root, glyphs, withComments) {
    var lines = [];
    function walk(node, prefix, isLast, depth) {
      var connector = depth === 0 ? '' : prefix + (isLast ? glyphs[1] : glyphs[0]);
      lines.push(connector + displayName(node) + commentSuffix(node, withComments));
      if (node.type === 'folder' && node.children) {
        var childPrefix = depth === 0 ? '' : prefix + (isLast ? glyphs[3] : glyphs[2]);
        for (var i = 0; i < node.children.length; i++) {
          walk(node.children[i], childPrefix, i === node.children.length - 1, depth + 1);
        }
      }
    }
    var top = root.children || [];
    for (var i = 0; i < top.length; i++) {
      walk(top[i], '', i === top.length - 1, 0);
    }
    return lines.join('\n');
  }

  function serializeMarkdown(root, withComments) {
    var lines = [];
    function walk(node, depth) {
      lines.push(new Array(depth + 1).join('  ') + '- ' + displayName(node) + commentSuffix(node, withComments));
      if (node.type === 'folder' && node.children) {
        for (var i = 0; i < node.children.length; i++) {
          walk(node.children[i], depth + 1);
        }
      }
    }
    var top = root.children || [];
    for (var i = 0; i < top.length; i++) { walk(top[i], 0); }
    return lines.join('\n');
  }

  function serializePaths(root, withComments) {
    var lines = [];
    function walk(node, prefix) {
      var path = prefix ? prefix + '/' + node.name : node.name;
      if (node.type === 'file') {
        lines.push(path + commentSuffix(node, withComments));
      } else if (!node.children || !node.children.length) {
        lines.push(path + '/' + commentSuffix(node, withComments));   // empty folder still listed
      } else {
        // Non-empty folders normally stay implicit, but a commented one
        // needs its own line so the comment round-trips (the parser's
        // name-dedupe merges it with the child paths that follow).
        if (withComments && node.comment) {
          lines.push(path + '/' + commentSuffix(node, withComments));
        }
        for (var i = 0; i < node.children.length; i++) {
          walk(node.children[i], path);
        }
      }
    }
    var top = root.children || [];
    for (var i = 0; i < top.length; i++) { walk(top[i], ''); }
    return lines.join('\n');
  }

  //
  //------- Entry point -------//
  //

  // format: 'unicode-tree' | 'ascii-tree' | 'markdown-list' | 'path-list'
  // options: {fence: boolean, comments: boolean}
  function serialize(root, format, options) {
    var withComments = !!(options && options.comments);
    var text;
    if (format === 'ascii-tree' || format === 'unicode-tree') {
      text = serializeTreeFormat(root, GLYPHS[format], withComments);
    } else if (format === 'markdown-list') {
      text = serializeMarkdown(root, withComments);
    } else if (format === 'path-list') {
      text = serializePaths(root, withComments);
    } else {
      text = serializeTreeFormat(root, GLYPHS['unicode-tree'], withComments);
    }
    if (options && options.fence) {
      text = '```text\n' + text + '\n```';
    }
    return text;
  }

  //
  //------- Init -------//
  //

  function initTreeSerializers() {
    window.FolderStructure = window.FolderStructure || {};
    window.FolderStructure.serializers = {
      serialize: serialize
    };
    console.log('tree-serializers.js v' + VERSION + ' initialised');
  }

  initTreeSerializers();
})();
