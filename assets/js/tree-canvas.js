/* ─────────────────────────────
   TREE CANVAS
   ─────────────────────────────
   Pan / zoom / centering for the full-screen diagram. The viewport
   (.canvas-viewport) owns pointer + wheel gestures; the surface
   (.canvas-surface) is moved with translate(x,y) scale(z). The
   JS-set transform is view state, not styling. A 4px threshold
   separates clicks (toggle + center) from drags (pan); panning
   swallows the click that would otherwise fire on release.
   Wheel gestures follow the design-tool (Figma) model: plain scroll
   pans, Shift+wheel pans horizontally, Ctrl/⌘+wheel zooms at the
   cursor (browsers report a trackpad pinch as Ctrl+wheel, so pinch
   zooms via the same branch).
   Clicking any row centers it at 1/3 viewport width, 1/2 height —
   folders toggle open/closed as well. Clicking empty canvas clears
   the selection.
   ───────────────────────────── */

(function () {
  var VERSION = '1.2.0';
  var DRAG_THRESHOLD_PX = 4;
  var ZOOM_MIN = 0.25;
  var ZOOM_MAX = 2.5;
  var ZOOM_STEP = 1.25;
  var WHEEL_ZOOM_SPEED = 0.0015;
  // Firefox reports mouse-wheel deltas in lines, not pixels.
  var WHEEL_LINE_PX = 16;
  var FIT_PADDING_PX = 64;

  var viewportEl = null;
  var surfaceEl = null;

  var pointers = {};        // pointerId -> {x, y}
  var pointerCount = 0;
  var panStart = null;      // {x, y, viewX, viewY}
  var isPanning = false;
  var pinchStartDist = 0;
  var pinchStartZoom = 1;
  var reducedMotion = false;

  function view() {
    return window.FolderStructure.model.state.view;
  }

  //
  //------- Transform -------//
  //

  function applyTransform() {
    var v = view();
    surfaceEl.style.transform = 'translate(' + v.x + 'px, ' + v.y + 'px) scale(' + v.zoom + ')';
  }

  function clampZoom(z) {
    return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z));
  }

  // Zooms to newZoom keeping the viewport point (cx, cy) fixed.
  function zoomAbout(newZoom, cx, cy) {
    var v = view();
    newZoom = clampZoom(newZoom);
    v.x = cx - (cx - v.x) * (newZoom / v.zoom);
    v.y = cy - (cy - v.y) * (newZoom / v.zoom);
    v.zoom = newZoom;
    applyTransform();
    window.FolderStructure.model.notifyViewChange();
  }

  function zoomBy(factor) {
    zoomAbout(view().zoom * factor, viewportEl.clientWidth / 2, viewportEl.clientHeight / 2);
  }

  function zoomTo100() {
    zoomAbout(1, viewportEl.clientWidth / 2, viewportEl.clientHeight / 2);
  }

  function fit() {
    var layoutResult = window.FolderStructure.render.getLayout();
    if (!layoutResult || !layoutResult.rows.length) { return; }
    var v = view();
    var vw = viewportEl.clientWidth;
    var vh = viewportEl.clientHeight;
    var bw = layoutResult.bounds.w;
    var bh = layoutResult.bounds.h;
    var z = clampZoom(Math.min((vw - FIT_PADDING_PX * 2) / bw, (vh - FIT_PADDING_PX * 2) / bh));
    if (z > 1) { z = 1; }
    v.zoom = z;
    v.x = (vw - bw * z) / 2;
    v.y = (vh - bh * z) / 2;
    animateTransform();
    window.FolderStructure.model.notifyViewChange();
  }

  function centerOnNode(id) {
    var layoutResult = window.FolderStructure.render.getLayout();
    if (!layoutResult) { return; }
    var row = null;
    for (var i = 0; i < layoutResult.rows.length; i++) {
      if (layoutResult.rows[i].id === id) { row = layoutResult.rows[i]; break; }
    }
    if (!row) { return; }
    var v = view();
    var layoutApi = window.FolderStructure.layout;
    v.x = viewportEl.clientWidth / 3 - (row.x) * v.zoom;
    v.y = viewportEl.clientHeight / 2 - (row.y + layoutApi.ROW_H / 2) * v.zoom;
    animateTransform();
    window.FolderStructure.model.notifyViewChange();
  }

  function animateTransform() {
    if (reducedMotion) {
      applyTransform();
      return;
    }
    surfaceEl.classList.add('is-animating');
    applyTransform();
  }

  function handleTransitionEnd(event) {
    if (event.target === surfaceEl) {
      surfaceEl.classList.remove('is-animating');
    }
  }

  //
  //------- Pointer gestures -------//
  //

  function pinchDistance() {
    var ids = Object.keys(pointers);
    var a = pointers[ids[0]];
    var b = pointers[ids[1]];
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  function pinchMidpoint() {
    var ids = Object.keys(pointers);
    var a = pointers[ids[0]];
    var b = pointers[ids[1]];
    var rect = viewportEl.getBoundingClientRect();
    return { x: (a.x + b.x) / 2 - rect.left, y: (a.y + b.y) / 2 - rect.top };
  }

  function handlePointerDown(event) {
    if (event.button !== 0 && event.pointerType === 'mouse') { return; }
    pointers[event.pointerId] = { x: event.clientX, y: event.clientY };
    pointerCount += 1;
    // Capture is taken only once panning starts: capturing on pointerdown
    // would retarget the composed click event to the viewport and rows
    // would never receive their clicks.
    if (pointerCount === 1) {
      var v = view();
      panStart = { x: event.clientX, y: event.clientY, viewX: v.x, viewY: v.y };
      isPanning = false;
    } else if (pointerCount === 2) {
      pinchStartDist = pinchDistance();
      pinchStartZoom = view().zoom;
      isPanning = true;
    }
  }

  function handlePointerMove(event) {
    if (!pointers[event.pointerId]) { return; }
    pointers[event.pointerId] = { x: event.clientX, y: event.clientY };

    if (pointerCount === 2) {
      var mid = pinchMidpoint();
      var dist = pinchDistance();
      if (pinchStartDist > 0) {
        zoomAbout(pinchStartZoom * (dist / pinchStartDist), mid.x, mid.y);
      }
      return;
    }
    if (!panStart) { return; }

    var dx = event.clientX - panStart.x;
    var dy = event.clientY - panStart.y;
    if (!isPanning && Math.hypot(dx, dy) > DRAG_THRESHOLD_PX) {
      isPanning = true;
      viewportEl.classList.add('is-panning');
      viewportEl.setPointerCapture(event.pointerId);
    }
    if (isPanning) {
      var v = view();
      v.x = panStart.viewX + dx;
      v.y = panStart.viewY + dy;
      applyTransform();
    }
  }

  function handlePointerUp(event) {
    if (!pointers[event.pointerId]) { return; }
    delete pointers[event.pointerId];
    pointerCount = Math.max(0, pointerCount - 1);
    if (pointerCount === 0) {
      if (isPanning) {
        // Swallow the click that follows a pan.
        document.addEventListener('click', swallowClick, true);
        window.FolderStructure.model.notifyViewChange();
      }
      viewportEl.classList.remove('is-panning');
      panStart = null;
      isPanning = false;
    }
  }

  function swallowClick(event) {
    event.stopPropagation();
    event.preventDefault();
    document.removeEventListener('click', swallowClick, true);
  }

  function handleWheel(event) {
    event.preventDefault();
    var scale = event.deltaMode === 1 ? WHEEL_LINE_PX
      : event.deltaMode === 2 ? viewportEl.clientHeight
      : 1;
    if (event.ctrlKey || event.metaKey) {
      var rect = viewportEl.getBoundingClientRect();
      var cx = event.clientX - rect.left;
      var cy = event.clientY - rect.top;
      // Pinch deltas are small relative to wheel ticks — boost them.
      var factor = Math.exp(-event.deltaY * scale * WHEEL_ZOOM_SPEED * (event.ctrlKey ? 4 : 1));
      zoomAbout(view().zoom * factor, cx, cy);
      return;
    }
    var dx = event.deltaX * scale;
    var dy = event.deltaY * scale;
    // Shift turns a mouse wheel's vertical delta into horizontal pan.
    // Some browsers pre-swap the axes for Shift+wheel, so only remap
    // when the event still reports a vertical-only delta.
    if (event.shiftKey && dx === 0) { dx = dy; dy = 0; }
    var v = view();
    v.x -= dx;
    v.y -= dy;
    applyTransform();
    window.FolderStructure.model.notifyViewChange();
  }

  //
  //------- Row activation -------//
  //

  function activateNode(id) {
    var model = window.FolderStructure.model;
    var node = model.findNode(id);
    if (!node) { return; }
    model.state.focusedId = id;
    if (node.type === 'folder') {
      model.toggle(id);      // re-renders via fs:modelchange
    } else {
      window.FolderStructure.render.render();
    }
    centerOnNode(id);
    var rowEl = window.FolderStructure.render.getRowEl(id);
    if (rowEl) { rowEl.focus({ preventScroll: true }); }
  }

  // Clicking empty canvas clears the selection (and with it the edit
  // chip). The first row stays keyboard-reachable via tree-render's
  // tab-stop fallback.
  function clearSelection() {
    var model = window.FolderStructure.model;
    if (model.state.focusedId === null) { return; }
    model.state.focusedId = null;
    window.FolderStructure.render.render();
    model.notifyViewChange();
  }

  function handleViewportClick(event) {
    if (event.target.closest('.tree-item-overlays') || event.target.closest('.add-pill')) { return; }
    var rowEl = event.target.closest('.tree-item');
    if (!rowEl) {
      clearSelection();
      return;
    }
    activateNode(rowEl.getAttribute('data-id'));
  }

  //
  //------- Init -------//
  //

  function initTreeCanvas() {
    viewportEl = document.querySelector('.canvas-viewport');
    surfaceEl = document.querySelector('.canvas-surface');
    if (!viewportEl || !surfaceEl) { return; }

    reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    viewportEl.addEventListener('pointerdown', handlePointerDown);
    viewportEl.addEventListener('pointermove', handlePointerMove);
    viewportEl.addEventListener('pointerup', handlePointerUp);
    viewportEl.addEventListener('pointercancel', handlePointerUp);
    viewportEl.addEventListener('wheel', handleWheel, { passive: false });
    viewportEl.addEventListener('click', handleViewportClick);
    surfaceEl.addEventListener('transitionend', handleTransitionEnd);

    applyTransform();

    window.FolderStructure = window.FolderStructure || {};
    window.FolderStructure.canvas = {
      fit: fit,
      zoomIn: function zoomIn() { zoomBy(ZOOM_STEP); },
      zoomOut: function zoomOut() { zoomBy(1 / ZOOM_STEP); },
      zoomTo100: zoomTo100,
      centerOnNode: centerOnNode,
      activateNode: activateNode
    };
    console.log('tree-canvas.js v' + VERSION + ' initialised');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTreeCanvas);
  } else {
    initTreeCanvas();
  }
})();
