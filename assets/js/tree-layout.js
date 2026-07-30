/* ─────────────────────────────
   TREE LAYOUT
   ─────────────────────────────
   Pure geometry for the cascading-column diagram (per the Figma spec):
   every visible node occupies one 40px row in a single global row
   sequence (depth-first), and each open folder spawns a child column
   immediately to the right of its own label. Connector cells (30x40)
   stack in a column between parent and children.
   No DOM writes — returns rows/connectors/gaps/bounds for tree-render.
   Label widths are measured once per name via an offscreen canvas
   using the live computed font of a probe element.
   ───────────────────────────── */

(function () {
  var VERSION = '1.3.0';

  // Geometry contract with the Figma design and style.css (.tree-item et al).
  var ROW_H = 40;
  var CELL_W = 30;
  var ICON = 24;
  var GAP = 5;
  var MIN_GAP_WIDTH = 160;

  var measureContext = null;
  var measureFont = '';
  var letterSpacingPx = 0;
  var widthCache = {};

  //
  //------- Label measurement -------//
  //

  function refreshFontMetrics() {
    var probe = document.querySelector('.tree-measure-probe');
    if (!probe) { return; }
    var style = getComputedStyle(probe);
    var font = style.fontStyle + ' ' + style.fontWeight + ' ' + style.fontSize + ' ' + style.fontFamily;
    var spacing = parseFloat(style.letterSpacing);
    if (font !== measureFont || spacing !== letterSpacingPx) {
      measureFont = font;
      letterSpacingPx = isNaN(spacing) ? 0 : spacing;
      widthCache = {};
    }
    if (!measureContext) {
      measureContext = document.createElement('canvas').getContext('2d');
    }
    measureContext.font = measureFont;
  }

  function labelWidth(name) {
    if (widthCache[name] !== undefined) { return widthCache[name]; }
    if (!measureContext) { refreshFontMetrics(); }
    var width = measureContext ? measureContext.measureText(name).width : name.length * 12;
    width += letterSpacingPx * Math.max(0, name.length - 1);
    width = Math.ceil(width);
    widthCache[name] = width;
    return width;
  }

  //
  //------- Layout -------//
  //

  // Returns {rows, connectors, gaps, bounds}
  // row: {id, name, type, comment, open, x, y, row, level, posInSet, setSize, parentId, width}
  // connector: {key, x, y, glyph}
  // gap: {key, parentId, index, x, y, width}  (insertion points, edit mode)
  function layout() {
    var model = window.FolderStructure.model;
    refreshFontMetrics();

    var rows = [];
    var connectors = [];
    var gaps = [];
    var rowCounter = 0;
    var maxX = 0;

    // Comments render in an overlay pill and deliberately stay out of
    // row geometry — only the name participates in layout.
    function rowWidth(node) {
      return ICON + GAP + labelWidth(node.name);
    }

    // Lays out the children of an open folder whose connector column sits
    // at connX, with the parent occupying row parentRow. Appends to
    // rows/connectors/gaps.
    function layoutChildren(parent, parentRow, connX, level) {
      var children = parent.children || [];
      var childX = connX + CELL_W + GAP;
      var childRows = [];
      var maxChildWidth = MIN_GAP_WIDTH;
      var i;

      for (i = 0; i < children.length; i++) {
        var child = children[i];
        var isOpen = child.type === 'folder' && !!child.open;
        var y = rowCounter * ROW_H;
        var width = rowWidth(child);
        if (width > maxChildWidth) { maxChildWidth = width; }
        childRows.push(rowCounter);
        rows.push({
          id: child.id,
          name: child.name,
          type: child.type,
          comment: child.comment,
          open: isOpen,
          x: childX,
          y: y,
          row: rowCounter,
          level: level,
          posInSet: i + 1,
          setSize: children.length,
          parentId: parent.id,
          width: width
        });
        var rightEdge = childX + width;
        if (rightEdge > maxX) { maxX = rightEdge; }
        rowCounter += 1;
        if (child.type === 'folder' && child.open && child.children && child.children.length) {
          var childConnX = childX + width + GAP;
          connectors.push({
            key: child.id + ':arm',
            x: childConnX,
            y: y,
            glyph: 'tree-first-child'
          });
          layoutChildren(child, childRows[childRows.length - 1], childConnX, level + 1);
        }
      }

      // Connector cells for this column: tee/elbow on direct child rows,
      // pass-through on rows occupied by earlier siblings' descendants.
      if (children.length && connX >= 0) {
        var lastChildRow = childRows[childRows.length - 1];
        for (var r = parentRow + 1; r <= lastChildRow; r++) {
          var childIndex = childRows.indexOf(r);
          var glyph;
          if (childIndex === -1) {
            glyph = 'tree-sibling';
          } else if (childIndex === children.length - 1) {
            glyph = 'tree-last-child';
          } else {
            glyph = 'tree-non-last-child';
          }
          connectors.push({
            key: parent.id + ':' + r,
            x: connX,
            y: r * ROW_H,
            glyph: glyph
          });
        }
      }

      // Insertion gaps (edit mode): before each child and after the last.
      // The end gap sits after the whole visible subtree (rowCounter is
      // already past it when this loop runs).
      for (i = 0; i <= children.length; i++) {
        var boundaryRow = i < children.length ? childRows[i] : rowCounter;
        gaps.push({
          key: parent.id + ':gap:' + i,
          parentId: parent.id,
          index: i,
          x: childX,
          y: boundaryRow * ROW_H,
          width: maxChildWidth
        });
      }
    }

    // Root children form column 0 with no connector column to their left.
    var root = model.state.root;
    layoutChildren(root, -1, 0 - CELL_W - GAP, 1);

    return {
      rows: rows,
      connectors: connectors,
      gaps: gaps,
      bounds: { w: maxX, h: rowCounter * ROW_H }
    };
  }

  //
  //------- Init -------//
  //

  function initTreeLayout() {
    window.FolderStructure = window.FolderStructure || {};
    window.FolderStructure.layout = {
      layout: layout,
      refreshFontMetrics: refreshFontMetrics,
      ROW_H: ROW_H,
      CELL_W: CELL_W,
      ICON: ICON,
      GAP: GAP
    };
    console.log('tree-layout.js v' + VERSION + ' initialised');
  }

  initTreeLayout();
})();
