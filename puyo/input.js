(function (global) {
  'use strict';

  const VERSION = 1;

  function actionForKey(key) {
    if (key === 'ArrowLeft' || key === 'a' || key === 'A') return 'left';
    if (key === 'ArrowRight' || key === 'd' || key === 'D') return 'right';
    if (key === 'ArrowDown' || key === 's' || key === 'S') return 'down';
    if (key === 'ArrowUp' || key === 'x' || key === 'X') return 'cw';
    if (key === 'z' || key === 'Z') return 'ccw';
    if (key === ' ') return 'drop';
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
    let touchStart = null;

    function stop() {
      clearTimeout(holdTimer);
      clearInterval(repeatTimer);
      holdTimer = null;
      repeatTimer = null;
      if (heldButton) heldButton.classList.remove('is-pressed');
      heldButton = null;
    }

    options.controls.forEach((button) => {
      button.addEventListener('pointerdown', (event) => {
        event.preventDefault();
        stop();
        heldButton = button;
        button.classList.add('is-pressed');
        if (button.setPointerCapture) button.setPointerCapture(event.pointerId);
        const action = button.dataset.a;
        options.onAction(action);
        if (action === 'left' || action === 'right' || action === 'down') {
          holdTimer = setTimeout(() => {
            repeatTimer = setInterval(() => options.onAction(action), action === 'down' ? 42 : 76);
          }, 185);
        }
      });
      button.addEventListener('pointerup', stop);
      button.addEventListener('pointercancel', stop);
      button.addEventListener('lostpointercapture', stop);
    });

    options.document.addEventListener('keydown', (event) => {
      const key = event.key;
      if (key === 'Escape' && options.isBuildOpen()) {
        event.preventDefault();
        options.onCloseBuild();
        return;
      }
      if (['ArrowLeft', 'ArrowRight', 'ArrowDown', 'ArrowUp', ' ', 'z', 'Z', 'x', 'X'].includes(key)) event.preventDefault();
      if (event.repeat && !['ArrowLeft', 'ArrowRight', 'ArrowDown'].includes(key)) return;
      const action = actionForKey(key);
      if (action) options.onAction(action);
      else if (key === 'p' || key === 'P' || key === 'Escape') options.onPause();
    });

    options.boardWrap.addEventListener('pointerdown', (event) => {
      touchStart = { x: event.clientX, y: event.clientY };
    });
    options.boardWrap.addEventListener('pointerup', (event) => {
      if (!touchStart) return;
      options.onAction(swipeAction(touchStart, { x: event.clientX, y: event.clientY }));
      touchStart = null;
    });

    return Object.freeze({ stop });
  }

  global.PuyoInput = Object.freeze({ VERSION, create, actionForKey, swipeAction });
})(typeof window !== 'undefined' ? window : globalThis);
