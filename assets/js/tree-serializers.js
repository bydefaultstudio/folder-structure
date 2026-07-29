/* ─────────────────────────────
   TREE SERIALIZERS
   ─────────────────────────────
   Tree → text in the four export notations (docs/tree-notation.md is
   authoritative): Unicode tree (default, AI-ready), ASCII tree,
   markdown nested list, and path list. Folders always get a trailing
   slash. Optional wrap in a ```text fence. Pure functions, no DOM.
   Round-trip property: parsers.parse(serialize(tree, f)) reproduces
   the same structure for every format.
   ───────────────────────────── */

(function () {
  var VERSION = '1.0.0';

  // [branch, lastBranch, passThrough, blank]
  var GLYPHS = {
    'unicode-tree': ['├── ', '└── ', '│   ', '    '],
    'ascii-tree': ['|-- ', '`-- ', '|   ', '    ']
  };

  function displayName(node) {
    return node.type === 'folder' ? node.name + '/' : node.name;
  }

  //
  //------- Formats -------//
  //

  function serializeTreeFormat(root, glyphs) {
    var lines = [];
    function walk(node, prefix, isLast, depth) {
      var connector = depth === 0 ? '' : prefix + (isLast ? glyphs[1] : glyphs[0]);
      lines.push(connector + displayName(node));
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

  function serializeMarkdown(root) {
    var lines = [];
    function walk(node, depth) {
      lines.push(new Array(depth + 1).join('  ') + '- ' + displayName(node));
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

  function serializePaths(root) {
    var lines = [];
    function walk(node, prefix) {
      var path = prefix ? prefix + '/' + node.name : node.name;
      if (node.type === 'file') {
        lines.push(path);
      } else if (!node.children || !node.children.length) {
        lines.push(path + '/');                      // empty folder still listed
      } else {
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
  // options: {fence: boolean}
  function serialize(root, format, options) {
    var text;
    if (format === 'ascii-tree' || format === 'unicode-tree') {
      text = serializeTreeFormat(root, GLYPHS[format]);
    } else if (format === 'markdown-list') {
      text = serializeMarkdown(root);
    } else if (format === 'path-list') {
      text = serializePaths(root);
    } else {
      text = serializeTreeFormat(root, GLYPHS['unicode-tree']);
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
