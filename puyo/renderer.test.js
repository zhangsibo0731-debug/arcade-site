'use strict';

const assert = require('assert');
global.devicePixelRatio = 3;
require('./renderer.js');

function context(metrics) {
  const gradient = { addColorStop() {} };
  return new Proxy({ createRadialGradient: () => {
    if (metrics) metrics.radialGradients++;
    return gradient;
  } }, {
    get(target, key) {
      if (key in target) return target[key];
      if (typeof key === 'string' && key.startsWith('create')) return () => gradient;
      return () => {};
    },
    set(target, key, value) { target[key] = value; return true; },
  });
}

const metrics = { radialGradients: 0 };
const boardContext = context(metrics);
const nextContext = context();
const canvas = { style: {}, getContext: () => boardContext };
const nextCanvas = { getContext: () => nextContext };
const boardWrap = { style: { setProperty(name, value) { this[name] = value; } } };
const nextPanel = { classList: { toggle() {} } };
const nextLabel = { textContent: '' };
const renderer = global.PuyoRenderer.create({
  canvas,
  nextCanvas,
  boardWrap,
  boardArea: { getBoundingClientRect: () => ({ width: 300, height: 480 }) },
  nextPanel,
  nextLabel,
  colors: ['#f00', '#ff0'],
  darks: ['#900', '#990'],
  rows: 12,
  cols: 6,
  garbage: 6,
});

assert.strictEqual(renderer.resize(), 40);
assert.strictEqual(canvas.width, 480);
assert.strictEqual(canvas.height, 960);
assert.strictEqual(canvas.style.width, '240px');
assert.strictEqual(boardWrap.style['--cell'], '40px');
assert.doesNotThrow(() => renderer.drawNext([[1, 2], [2, 1], [1, 1]], 3));
assert.strictEqual(nextLabel.textContent, 'NEXT 1 · 2 · 3');
assert.ok(renderer.bounceOut(0.9) > 0.9);
const board = Array.from({ length: 12 }, () => Array(6).fill(0));
board[11][0] = 1;
board[10][0] = 1;
board[11][1] = 6;
renderer.startPop([[0, 11]], 280);
renderer.startFall(new Map([['0,10', 2]]), 190);
renderer.startGarbageFall([[1, 11]], 590);
renderer.addRemoteLink([0, 11], [1, 11]);
renderer.burst(0, 11, 1, 2);
renderer.update(0.016);
assert.doesNotThrow(() => renderer.drawBoard({ board, ghostCells: [], activeCells: [] }));
assert.ok(metrics.radialGradients > 0, 'garbage cells should use the gray radial-gradient renderer');
renderer.resetEffects();

console.log('puyo renderer tests passed');
