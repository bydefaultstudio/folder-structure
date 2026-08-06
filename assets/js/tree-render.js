/* ─────────────────────────────
   TREE RENDER
   ─────────────────────────────
   Reconciles the layout output into the DOM inside .canvas-surface.
   Structure: a flat aria-hidden connector layer (painted beneath),
   a nested role=tree/role=group hierarchy for correct treeview
   semantics, and a flat aria-hidden layer of add-pills (edit mode;
   pills are mouse affordances — keyboard adding has its own shortcut).
   Rows and groups are keyed by node id and reused across renders, so
   position changes animate via the CSS transform transition instead of
   a rebuild. Listens for 'fs:modelchange'; re-renders once web fonts
   are ready (label measurement depends on them).
   ───────────────────────────── */

(function () {
  var VERSION = '1.8.0';
  var SPRITE = 'assets/icons/project-icons.svg';
  var DS_SPRITE = 'assets/icons/icons.svg';
  var SVG_NS = 'http://www.w3.org/2000/svg';
  var XLINK = 'http://www.w3.org/1999/xlink';

  var surfaceEl = null;
  var connectorLayerEl = null;
  var treeEl = null;
  var gapLayerEl = null;

  var rowEls = {};
  var groupEls = {};
  var connectorEls = {};
  var gapEls = {};
  var lastLayout = null;

  //
  //------- Element factories -------//
  //

  function makeIcon(symbolId, sprite, className) {
    var span = document.createElement('span');
    span.className = className;
    var svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    svg.setAttribute('aria-hidden', 'true');
    var use = document.createElementNS(SVG_NS, 'use');
    setIconHref(use, sprite, symbolId);
    svg.appendChild(use);
    span.appendChild(svg);
    return span;
  }

  function setIconHref(use, sprite, symbolId) {
    use.setAttribute('href', sprite + '#' + symbolId);
    use.setAttributeNS(XLINK, 'xlink:href', sprite + '#' + symbolId);
  }

  function makeActionButton(action, symbolId, sprite, label, tooltip) {
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'button';
    button.setAttribute('data-variant', 'transparent');
    button.setAttribute('data-icon-only', '');
    button.setAttribute('data-size', 'xsmall');
    button.setAttribute('data-action', action);
    button.setAttribute('aria-label', label);
    button.setAttribute('data-tooltip', tooltip);
    button.setAttribute('data-tooltip-position', 'top');
    button.tabIndex = -1;
    button.appendChild(makeIcon(symbolId, sprite, 'svg-icn'));
    return button;
  }

  function makeRowEl(row) {
    var el = document.createElement('div');
    el.className = 'tree-item is-entering';
    el.setAttribute('role', 'treeitem');
    el.setAttribute('data-id', row.id);
    el.tabIndex = -1;

    var icon = iconFor(row);
    el.appendChild(makeIcon(icon.symbol, icon.sprite, 'svg-icn tree-icon'));

    var label = document.createElement('span');
    label.className = 'tree-label';
    label.textContent = row.name;
    el.appendChild(label);

    // Overlay rail: selected-row furniture (edit chip + comment pill)
    // floats right of the row without participating in layout geometry.
    var overlays = document.createElement('span');
    overlays.className = 'tree-item-overlays';

    var actions = document.createElement('span');
    actions.className = 'tree-item-actions';
    // Every row gets the full set: a row's type can change under it
    // (the convert button), and this element is cached by id for the
    // life of the row, so anything built conditionally here would go
    // stale. CSS hides add-child on files via .is-file, which
    // updateRowEl keeps current.
    actions.appendChild(makeActionButton('add-child', 'add', SPRITE, 'Add inside ' + row.name, 'Add inside'));
    actions.appendChild(makeActionButton('move-up', 'arrow-up', SPRITE, 'Move ' + row.name + ' up', 'Move up'));
    actions.appendChild(makeActionButton('move-down', 'arrow-down', SPRITE, 'Move ' + row.name + ' down', 'Move down'));
    actions.appendChild(makeActionButton('outdent', 'chevron-left', DS_SPRITE, 'Move ' + row.name + ' out of its folder', 'Move out of folder'));
    actions.appendChild(makeActionButton('indent', 'chevron-right', DS_SPRITE, 'Move ' + row.name + ' into the folder above', 'Move into folder above'));
    var divider = document.createElement('span');
    divider.className = 'divider--vertical';
    divider.setAttribute('aria-hidden', 'true');
    actions.appendChild(divider);
    actions.appendChild(makeActionButton('rename', 'pencil', SPRITE, 'Rename ' + row.name, 'Rename'));
    actions.appendChild(makeActionButton('convert', 'swap', SPRITE, convertLabel(row), convertTooltip(row)));
    actions.appendChild(makeActionButton('delete', 'trash', SPRITE, 'Delete ' + row.name, 'Delete'));
    overlays.appendChild(actions);

    var pill = document.createElement('span');
    pill.className = 'tree-comment-pill';
    var comment = document.createElement('span');
    comment.className = 'tree-comment';
    comment.textContent = row.comment || '';
    pill.appendChild(comment);
    pill.appendChild(makeActionButton('comment-edit', 'chat', DS_SPRITE,
      (row.comment ? 'Edit comment on ' : 'Add comment to ') + row.name,
      row.comment ? 'Edit comment' : 'Add comment'));
    pill.appendChild(makeActionButton('comment-delete', 'close-circled', SPRITE, 'Delete comment on ' + row.name, 'Delete comment'));
    overlays.appendChild(pill);

    el.appendChild(overlays);

    requestAnimationFrame(function removeEntering() {
      el.classList.remove('is-entering');
    });
    return el;
  }

  function makeGroupEl(id) {
    var el = document.createElement('div');
    el.setAttribute('role', 'group');
    el.setAttribute('data-group-for', id);
    return el;
  }

  function makeConnectorEl(connector) {
    var el = makeIcon(connector.glyph, SPRITE, 'tree-connector');
    el.setAttribute('data-key', connector.key);
    el.setAttribute('data-glyph', connector.glyph);
    return el;
  }

  function makeGapEl(gap) {
    var wrapper = document.createElement('span');
    wrapper.className = 'add-pill';
    wrapper.setAttribute('data-key', gap.key);

    var action = document.createElement('button');
    action.type = 'button';
    action.className = 'add-pill-btn';
    action.tabIndex = -1;
    action.setAttribute('data-parent-id', gap.parentId);
    action.setAttribute('data-index', gap.index);
    var actionIcon = makeIcon('add', SPRITE, 'svg-icn add-pill-icon');
    action.appendChild(actionIcon);
    var actionText = document.createElement('span');
    actionText.className = 'add-pill-text';
    actionText.textContent = 'Add folder here';
    action.appendChild(actionText);
    wrapper.appendChild(action);

    var typeToggle = document.createElement('button');
    typeToggle.type = 'button';
    typeToggle.className = 'add-pill-type';
    typeToggle.tabIndex = -1;
    typeToggle.appendChild(makeIcon('file', DS_SPRITE, 'svg-icn add-pill-type-icon'));
    wrapper.appendChild(typeToggle);

    return wrapper;
  }

  // Files carry a per-extension mark from the design-system sprite;
  // folders and structural glyphs stay on the project sprite. Both
  // callers pass the pair straight to makeIcon/setIconHref.
  function iconFor(row) {
    if (row.type === 'file') {
      return { sprite: DS_SPRITE, symbol: window.FolderStructure.fileIcons.symbolFor(row.name) };
    }
    return { sprite: SPRITE, symbol: row.open ? 'folder-open' : 'folder' };
  }

  // The convert button keeps one glyph in both directions, so the type
  // it would produce lives in the label and tooltip instead.
  function convertLabel(row) {
    return 'Change ' + row.name + ' to a ' + (row.type === 'folder' ? 'file' : 'folder');
  }

  function convertTooltip(row) {
    return row.type === 'folder' ? 'Change to file' : 'Change to folder';
  }

  //
  //------- Reconciliation -------//
  //

  function setTransform(el, x, y) {
    var value = 'translate(' + x + 'px, ' + y + 'px)';
    if (el.style.transform !== value) { el.style.transform = value; }
  }

  function updateRowEl(el, row, focusedId, tabId, primaryIds) {
    setTransform(el, row.x, row.y);
    el.classList.toggle('is-open', row.open);
    el.classList.toggle('is-faded', !!primaryIds && !primaryIds[row.id]);
    el.classList.toggle('is-folder', row.type === 'folder');
    el.classList.toggle('is-file', row.type === 'file');
    el.classList.toggle('is-selected', row.id === focusedId);
    el.tabIndex = row.id === tabId ? 0 : -1;
    el.setAttribute('aria-level', row.level);
    el.setAttribute('aria-setsize', row.setSize);
    el.setAttribute('aria-posinset', row.posInSet);
    if (row.type === 'folder') {
      el.setAttribute('aria-expanded', row.open ? 'true' : 'false');
    } else {
      el.removeAttribute('aria-expanded');
    }
    var label = el.querySelector('.tree-label');
    if (label.textContent !== row.name) { label.textContent = row.name; }
    var commentText = row.comment || '';
    el.classList.toggle('is-commented', !!row.comment);
    var commentEl = el.querySelector('.tree-comment');
    if (commentEl.textContent !== commentText) { commentEl.textContent = commentText; }
    // Keep the add/edit distinction fresh, except while its input is open
    // (tree-edit owns the button state as check/save during editing).
    if (!el.classList.contains('is-commenting')) {
      var pillEditBtn = el.querySelector('[data-action="comment-edit"]');
      if (pillEditBtn) {
        pillEditBtn.setAttribute('aria-label', (row.comment ? 'Edit comment on ' : 'Add comment to ') + row.name);
        pillEditBtn.setAttribute('data-tooltip', row.comment ? 'Edit comment' : 'Add comment');
      }
      var pillDeleteBtn = el.querySelector('[data-action="comment-delete"]');
      if (pillDeleteBtn) {
        pillDeleteBtn.setAttribute('aria-label', 'Delete comment on ' + row.name);
      }
    }
    // The row's type can change under it, and this element is reused
    // for the life of the id — so the direction this button offers has
    // to be re-read on every pass, not fixed at creation.
    var convertBtn = el.querySelector('[data-action="convert"]');
    if (convertBtn) {
      convertBtn.setAttribute('aria-label', convertLabel(row));
      convertBtn.setAttribute('data-tooltip', convertTooltip(row));
    }
    var icon = iconFor(row);
    var iconUse = el.querySelector('.tree-icon use');
    setIconHref(iconUse, icon.sprite, icon.symbol);
  }

  // Ensures containerEl's children are exactly [expected...] in order,
  // moving/creating as needed without touching correctly-placed nodes.
  function syncSequence(containerEl, expected) {
    for (var i = 0; i < expected.length; i++) {
      var el = expected[i];
      if (containerEl.children[i] !== el) {
        containerEl.insertBefore(el, containerEl.children[i] || null);
      }
    }
    while (containerEl.children.length > expected.length) {
      containerEl.removeChild(containerEl.lastChild);
    }
  }

  function syncTreeStructure(rowsById, focusedId, tabId, primaryIds) {
    var model = window.FolderStructure.model;
    var seenRows = {};
    var seenGroups = {};

    function syncFolder(folderNode, containerEl) {
      var expected = [];
      var children = folderNode.children || [];
      for (var i = 0; i < children.length; i++) {
        var child = children[i];
        var row = rowsById[child.id];
        if (!row) { continue; }
        var el = rowEls[child.id];
        if (!el) {
          el = makeRowEl(row);
          rowEls[child.id] = el;
        }
        updateRowEl(el, row, focusedId, tabId, primaryIds);
        seenRows[child.id] = true;
        expected.push(el);
        if (child.type === 'folder' && child.open && child.children && child.children.length) {
          var group = groupEls[child.id];
          if (!group) {
            group = makeGroupEl(child.id);
            groupEls[child.id] = group;
          }
          seenGroups[child.id] = true;
          expected.push(group);
          syncFolder(child, group);
        }
      }
      syncSequence(containerEl, expected);
    }

    syncFolder(model.state.root, treeEl);

    Object.keys(rowEls).forEach(function dropStaleRow(id) {
      if (!seenRows[id]) {
        if (rowEls[id].parentNode) { rowEls[id].parentNode.removeChild(rowEls[id]); }
        delete rowEls[id];
      }
    });
    Object.keys(groupEls).forEach(function dropStaleGroup(id) {
      if (!seenGroups[id]) {
        if (groupEls[id].parentNode) { groupEls[id].parentNode.removeChild(groupEls[id]); }
        delete groupEls[id];
      }
    });
  }

  function syncFlatLayer(layerEl, items, els, makeEl, updateEl) {
    var seen = {};
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      var el = els[item.key];
      if (!el) {
        el = makeEl(item);
        els[item.key] = el;
        layerEl.appendChild(el);
      }
      updateEl(el, item);
      seen[item.key] = true;
    }
    Object.keys(els).forEach(function dropStale(key) {
      if (!seen[key]) {
        if (els[key].parentNode) { els[key].parentNode.removeChild(els[key]); }
        delete els[key];
      }
    });
  }

  function updateConnectorEl(el, connector) {
    setTransform(el, connector.x, connector.y);
    if (el.getAttribute('data-glyph') !== connector.glyph) {
      el.setAttribute('data-glyph', connector.glyph);
      setIconHref(el.querySelector('use'), SPRITE, connector.glyph);
    }
  }

  function updateGapEl(el, gap) {
    setTransform(el, gap.x, gap.y);
    el.style.width = gap.width + 'px';
    var btn = el.querySelector('.add-pill-btn');
    btn.setAttribute('data-parent-id', gap.parentId);
    btn.setAttribute('data-index', gap.index);
    var addType = (window.FolderStructure.edit && window.FolderStructure.edit.getAddType()) || 'folder';
    var text = el.querySelector('.add-pill-text');
    var expected = addType === 'file' ? 'Add file here' : 'Add folder here';
    if (text.textContent !== expected) { text.textContent = expected; }
    // The toggle shows what the pill currently adds; clicking flips it.
    // 'file' (the generic file mark) lives in the DS sprite, 'folder'
    // in the project sprite — the sprite switches with the symbol.
    if (addType === 'file') {
      setIconHref(el.querySelector('.add-pill-type-icon use'), DS_SPRITE, 'file');
    } else {
      setIconHref(el.querySelector('.add-pill-type-icon use'), SPRITE, 'folder');
    }
    var typeToggle = el.querySelector('.add-pill-type');
    var typeLabel = addType === 'file' ? 'Adding files. Switch to folders' : 'Adding folders. Switch to files';
    typeToggle.setAttribute('aria-label', typeLabel);
    typeToggle.setAttribute('data-tooltip', addType === 'file' ? 'Switch to folders' : 'Switch to files');
    typeToggle.setAttribute('data-tooltip-position', 'top');
  }

  //
  //------- Render -------//
  //

  function render() {
    if (!surfaceEl) { return; }
    var model = window.FolderStructure.model;
    var result = window.FolderStructure.layout.layout();
    lastLayout = result;

    var rowsById = {};
    for (var i = 0; i < result.rows.length; i++) { rowsById[result.rows[i].id] = result.rows[i]; }

    // Focused node may have become invisible (ancestor collapsed) — pull
    // focus up to the nearest visible ancestor before applying tabindex.
    var focusedId = model.state.focusedId;
    if (focusedId && !rowsById[focusedId]) {
      var ancestors = model.ancestorIds(focusedId);
      focusedId = null;
      for (var a = 0; a < ancestors.length; a++) {
        if (rowsById[ancestors[a]]) { focusedId = ancestors[a]; break; }
      }
      if (!focusedId && result.rows.length) { focusedId = result.rows[0].id; }
      model.state.focusedId = focusedId;
    }
    // Nothing selected is a valid state (canvas-click deselect). The
    // roving tab stop falls back to the first row so the tree stays
    // keyboard-reachable without visually selecting anything.
    var tabId = focusedId || (result.rows.length ? result.rows[0].id : null);

    // Selection-driven path fading: with a row selected, only that row,
    // its ancestors (the path to it), and — for folders — its immediate
    // children stay at full strength; every other row fades. With
    // nothing selected, primaryIds stays null and nothing fades.
    var primaryIds = null;
    if (focusedId) {
      primaryIds = {};
      primaryIds[focusedId] = true;
      var pathIds = model.ancestorIds(focusedId);
      for (var p = 0; p < pathIds.length; p++) { primaryIds[pathIds[p]] = true; }
      var focusedNode = model.findNode(focusedId);
      if (focusedNode && focusedNode.type === 'folder' && focusedNode.children) {
        for (var c = 0; c < focusedNode.children.length; c++) {
          primaryIds[focusedNode.children[c].id] = true;
        }
      }
    }

    syncTreeStructure(rowsById, focusedId, tabId, primaryIds);
    syncFlatLayer(connectorLayerEl, result.connectors, connectorEls, makeConnectorEl, updateConnectorEl);
    syncFlatLayer(gapLayerEl, result.gaps, gapEls, makeGapEl, updateGapEl);

    document.dispatchEvent(new CustomEvent('fs:render'));
  }

  function handleModelChange() {
    render();
  }

  //
  //------- Init -------//
  //

  function initTreeRender() {
    surfaceEl = document.querySelector('.canvas-surface');
    if (!surfaceEl) { return; }
    connectorLayerEl = surfaceEl.querySelector('.tree-connectors');
    treeEl = surfaceEl.querySelector('.tree');
    gapLayerEl = surfaceEl.querySelector('.tree-gaps');

    document.addEventListener('fs:modelchange', handleModelChange);
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function rerenderAfterFonts() {
        window.FolderStructure.layout.refreshFontMetrics();
        render();
      });
    }

    window.FolderStructure = window.FolderStructure || {};
    window.FolderStructure.render = {
      render: render,
      getLayout: function getLayout() { return lastLayout; },
      getRowEl: function getRowEl(id) { return rowEls[id] || null; }
    };
    render();
    console.log('tree-render.js v' + VERSION + ' initialised');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTreeRender);
  } else {
    initTreeRender();
  }
})();
