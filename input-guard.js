(function () {
  'use strict';

  const interactiveSelector = [
    'button',
    '[role="button"]',
    'canvas',
    '.controls',
    '.controls *',
    '.board',
    '.board *',
    '.board-wrap',
    '.board-wrap *',
    '.stage',
    '.stage *',
  ].join(',');

  const style = document.createElement('style');
  style.textContent = interactiveSelector + '{' +
    '-webkit-touch-callout:none!important;' +
    '-webkit-user-select:none!important;' +
    'user-select:none!important;' +
    'touch-action:manipulation;' +
    '-webkit-tap-highlight-color:transparent;' +
    '}' +
    'button *,[role="button"] *,canvas,img,svg{' +
    '-webkit-user-drag:none!important;' +
    'user-drag:none!important;' +
    '}';
  document.head.appendChild(style);

  function isGameControl(target) {
    return target instanceof Element && !!target.closest(interactiveSelector);
  }

  document.addEventListener('contextmenu', function (event) {
    if (isGameControl(event.target)) event.preventDefault();
  });
  document.addEventListener('selectstart', function (event) {
    if (isGameControl(event.target)) event.preventDefault();
  });
  document.addEventListener('dragstart', function (event) {
    if (isGameControl(event.target)) event.preventDefault();
  });
})();
