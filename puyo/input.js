(function (global) {
  'use strict';

  const VERSION = 2;
  const TIMINGS = Object.freeze({ horizontalDas: 170, horizontalArr: 60, downDas: 185, downArr: 42 });

  function actionForKey(key) {
    if (key === 'ArrowLeft' || key === 'a' || key === 'A') return 'left';
    if (key === 'ArrowRight' || key === 'd' || key === 'D') return 'right';
    if (key === 'ArrowDown' || key === 's' || key === 'S') return 'down';
    if (key === 'ArrowUp' || key === 'x' || key === 'X') return 'cw';
    if (key === 'z' || key === 'Z') return 'ccw';
    if (key === ' ') return 'drop';
    if (key === 'c' || key === 'C') return 'swap';
    return null;
  }

  function swipeAction(start, end) {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    if (Math.abs(dx) < 16 && Math.abs(dy) < 16) return 'cw';
    if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 'right' : 'left';
    if (dy > 45) return 'drop';
    if (dy > 0) return 'down';
    return 'cw';
  }

  function create(options) {
    let holdTimer = null;
    let repeatTimer = null;
    let heldButton = null;
    let heldToken = null;
    let touchStart = null;
    const host = options.global || global;
    const timers = options.timers || host;

    function stop() {
      timers.clearTimeout(holdTimer);
      timers.clearInterval(repeatTimer);
      holdTimer = null;
      repeatTimer = null;
      if (heldButton) heldButton.classList.remove('is-pressed');
      heldButton = null;
      heldToken = null;
      touchStart = null;
    }

    function startHold(action, button, token) {
      stop();
      heldButton = button || null;
      heldToken = token;
      if (heldButton) heldButton.classList.add('is-pressed');
      options.onAction(action);
      if (action !== 'left' && action !== 'right' && action !== 'down') return;
      const delay = action === 'down' ? TIMINGS.downDas : TIMINGS.horizontalDas;
      const interval = action === 'down' ? TIMINGS.downArr : TIMINGS.horizontalArr;
      holdTimer = timers.setTimeout(() => {
        options.onAction(action);
        repeatTimer = timers.setInterval(() => options.onAction(action), interval);
      }, delay);
    }

    options.controls.forEach((button) => {
      button.addEventListener('pointerdown', (event) => {
        event.preventDefault();
        if (button.setPointerCapture) button.setPointerCapture(event.pointerId);
        const action = button.dataset.a;
        startHold(action, button, 'pointer:' + event.pointerId);
      });
      const stopPointer = (event) => {
        if (heldToken === 'pointer:' + event.pointerId) stop();
      };
      button.addEventListener('pointerup', stopPointer);
      button.addEventListener('pointercancel', stopPointer);
      button.addEventListener('lostpointercapture', stopPointer);
    });

    options.document.addEventListener('keydown', (event) => {
      const key = event.key;
      if (key === 'Escape' && options.isBuildOpen()) {
        event.preventDefault();
        options.onCloseBuild();
        return;
      }
      const action = actionForKey(key);
      if (action) event.preventDefault();
      if (event.repeat) return;
      if (action === 'left' || action === 'right' || action === 'down') startHold(action, null, 'key:' + key.toLowerCase());
      else if (action) options.onAction(action);
      else if (key === 'p' || key === 'P' || key === 'Escape') options.onPause();
    });
    options.document.addEventListener('keyup', (event) => {
      if (heldToken === 'key:' + String(event.key).toLowerCase()) stop();
    });
    options.document.addEventListener('visibilitychange', () => {
      if (options.document.visibilityState === 'hidden') stop();
    });
    if (host.addEventListener) host.addEventListener('blur', stop);

    options.boardWrap.addEventListener('pointerdown', (event) => {
      touchStart = { x: event.clientX, y: event.clientY };
    });
    options.boardWrap.addEventListener('pointerup', (event) => {
      if (!touchStart) return;
      options.onAction(swipeAction(touchStart, { x: event.clientX, y: event.clientY }));
      touchStart = null;
    });
    options.boardWrap.addEventListener('pointercancel', () => { touchStart = null; });

    return Object.freeze({ stop });
  }

  global.PuyoInput = Object.freeze({ VERSION, TIMINGS, create, actionForKey, swipeAction });
})(typeof window !== 'undefined' ? window : globalThis);
