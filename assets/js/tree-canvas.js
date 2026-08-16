/* ─────────────────────────────
   TREE CANVAS
   ─────────────────────────────
   Pan / zoom / centering for the full-screen diagram. The viewport
   (.canvas-viewport) owns pointer + wheel gestures; the surface
   (.canvas-surface) is moved with translate(x,y) scale(z). The
   JS-set transform is view state, not styling. A 4px threshold
   separates clicks (select / toggle) from drags (pan); panning
   swallows the click that would otherwise fire on release. A gesture
   that starts inside an open inline input is exempt from both — it
   belongs to the input (see trackGestureOrigin).
   Wheel gestures follow the design-tool (Figma) model: plain scroll
   pans, Shift+wheel pans horizontally, Ctrl/⌘+wheel zooms at the
   cursor (browsers report a trackpad pinch as Ctrl+wheel, so pinch
   zooms via the same branch).
   The embed (body.is-embed) swaps that for cooperative gestures —
   the Google Maps model — because it lives inside someone else's
   scrolling article: a plain wheel and a lone touch belong to the
   host page; only Ctrl/⌘+wheel, mouse drags and two-finger touch
   gestures act on the canvas. Declined gestures raise
   fs:gesturehint so embed.js can teach the modifier.
   Clicking a row selects it; clicking the already-selected row toggles
   a folder open/closed and centers it at 1/3 viewport width, 1/2
   height. Clicking empty canvas clears the selection.
   ───────────────────────────── */

(function () {
  var VERSION = '1.6.0';
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
  var pinchLastMid = null;  // previous two-finger midpoint, for two-finger pan
  var reducedMotion = false;
  var gestureInInput = false;   // this gesture began inside an inline input
  var isEmbed = false;          // embed viewer: cooperative gestures

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

  // A pointer gesture that begins inside an open inline input belongs to
  // that input for its whole life: placing the caret, and dragging to
  // select text — which readily overshoots the input's narrow edges, so
  // the click ending such a drag targets an ancestor and can't be judged
  // on its own target. Recorded on document (capture) rather than on the
  // viewport so a press anywhere, toolbar included, clears it.
  function trackGestureOrigin(event) {
    gestureInInput = !!event.target.closest('.tree-rename-input, .tree-comment-input');
  }

  function handlePointerDown(event) {
    // Panning must not arm inside an input: crossing the 4px threshold
    // takes pointer capture, which steals the text selection and
    // retargets the click away from the input.
    if (gestureInInput) { return; }
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
      // Cooperative gestures: in the embed a lone touch is the host
      // page's scroll, so it never arms a canvas pan. Mouse drags
      // still pan — a drag can't scroll the parent article.
      if (isEmbed && event.pointerType === 'touch') { panStart = null; }
    } else if (pointerCount === 2) {
      pinchStartDist = pinchDistance();
      pinchStartZoom = view().zoom;
      pinchLastMid = pinchMidpoint();
      isPanning = true;
    }
  }

  function handlePointerMove(event) {
    if (!pointers[event.pointerId]) { return; }
    pointers[event.pointerId] = { x: event.clientX, y: event.clientY };

    if (pointerCount === 2) {
      var mid = pinchMidpoint();
      var dist = pinchDistance();
      // Two fingers both pan (midpoint travel) and zoom (spread) —
      // on the embed's touch screens this is the only way to move
      // the diagram, since a lone finger scrolls the host page.
      var v2 = view();
      v2.x += mid.x - pinchLastMid.x;
      v2.y += mid.y - pinchLastMid.y;
      pinchLastMid = mid;
      if (pinchStartDist > 0) {
        zoomAbout(pinchStartZoom * (dist / pinchStartDist), mid.x, mid.y);
      } else {
        applyTransform();
        window.FolderStructure.model.notifyViewChange();
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

  // A cancelled single touch in the embed means the browser claimed
  // the gesture for page scrolling (touch-action allows it there) —
  // exactly the moment to teach the two-finger alternative.
  function handlePointerCancel(event) {
    if (isEmbed && pointers[event.pointerId] && event.pointerType === 'touch' && pointerCount === 1) {
      requestGestureHint('touch');
    }
    handlePointerUp(event);
  }

  function swallowClick(event) {
    event.stopPropagation();
    event.preventDefault();
    document.removeEventListener('click', swallowClick, true);
  }

  // touch-action lets the browser own one-finger scrolling in the
  // embed; two-finger gestures stay ours, and that claim has to be
  // made on the raw touch events — pointer events can't cancel a
  // browser scroll.
  function handleTouchMove(event) {
    if (event.touches.length >= 2) { event.preventDefault(); }
  }

  // Declined embed gestures raise a bubbling event; embed.js owns the
  // hint overlay so the canvas stays free of embed-only UI.
  function requestGestureHint(kind) {
    viewportEl.dispatchEvent(new CustomEvent('fs:gesturehint', { bubbles: true, detail: { kind: kind } }));
  }

  function handleWheel(event) {
    // Cooperative scrolling in the embed: a plain wheel is the host
    // article's scroll and must chain to the parent page untouched.
    // Only modifier gestures are claimed — Ctrl/⌘+wheel zooms (a
    // trackpad pinch arrives as Ctrl+wheel, so pinch still works).
    if (isEmbed && !event.ctrlKey && !event.metaKey) {
      requestGestureHint('wheel');
      return;
    }
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

  // Selection and disclosure are staged, not fused: the first click on a
  // row selects it (revealing its comment pill and, in edit mode, the
  // edit chip) without disturbing the diagram; clicking the row that is
  // already selected toggles it. Inspect, then navigate. Keyboard
  // Enter/Space routes here too, so both input methods obey one rule —
  // ←/→ remain the one-press disclosure shortcut. One exception:
  // a click landing on the folder mark itself (iconClick) is read as
  // the disclosure control and toggles in a single press.
  function activateNode(id, iconClick) {
    var model = window.FolderStructure.model;
    var node = model.findNode(id);
    if (!node) { return; }
    var wasFocused = model.state.focusedId === id;
    model.state.focusedId = id;
    if (node.type === 'folder' && (wasFocused || iconClick)) {
      model.toggle(id);      // re-renders via fs:modelchange, picking up the focus too
      centerOnNode(id);      // opening can push children off screen
    } else if (!wasFocused) {
      // Selecting only reveals furniture — no centering, because the row
      // the user just clicked is by definition already on screen.
      window.FolderStructure.render.render();
    }
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
    // Editing a row's name must not double as clicking the row, or
    // moving the caret would toggle the folder out from under the input.
    if (gestureInInput) { return; }
    if (event.target.closest('.tree-item-overlays') || event.target.closest('.add-pill')) { return; }
    var rowEl = event.target.closest('.tree-item');
    if (!rowEl) {
      clearSelection();
      return;
    }
    activateNode(rowEl.getAttribute('data-id'), Boolean(event.target.closest('.tree-icon')));
  }

  //
  //------- Init -------//
  //

  function initTreeCanvas() {
    viewportEl = document.querySelector('.canvas-viewport');
    surfaceEl = document.querySelector('.canvas-surface');
    if (!viewportEl || !surfaceEl) { return; }

    reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    isEmbed = document.body.classList.contains('is-embed');

    document.addEventListener('pointerdown', trackGestureOrigin, true);
    viewportEl.addEventListener('pointerdown', handlePointerDown);
    viewportEl.addEventListener('pointermove', handlePointerMove);
    viewportEl.addEventListener('pointerup', handlePointerUp);
    viewportEl.addEventListener('pointercancel', handlePointerCancel);
    viewportEl.addEventListener('wheel', handleWheel, { passive: false });
    if (isEmbed) {
      viewportEl.addEventListener('touchmove', handleTouchMove, { passive: false });
    }
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
      activateNode: activateNode,
      isGestureInInput: function isGestureInInput() { return gestureInInput; }
    };
    console.log('tree-canvas.js v' + VERSION + ' initialised');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTreeCanvas);
  } else {
    initTreeCanvas();
  }
})();
