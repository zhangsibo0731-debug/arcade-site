'use strict';

const assert = require('assert');
const renderer = require('./puyo-renderer.js');

function game(width, height, top, bottom) {
  return { w: width, h: height, safe: { top, bottom } };
}

[
  game(390, 844, 47, 810),
  game(375, 667, 20, 647),
  game(430, 932, 47, 898),
].forEach((device) => {
  const value = renderer.layout(device);
  assert(value.cell >= 30, '棋盘格不能小于可操作尺寸');
  assert(value.boardX >= 0 && value.boardY >= device.safe.top, '棋盘必须位于安全区内');
  assert(value.sideX + value.sideW <= device.w, '侧栏不能超出屏幕');
  assert(value.controlsY + 58 <= device.safe.bottom, '操作区不能进入底部危险区');
  assert.strictEqual(value.boardW, value.cell * 6);
  assert.strictEqual(value.boardH, value.cell * 12);
  const challenge = renderer.layout(Object.assign({}, device, { gameType: 'challenge' }));
  assert.ok(challenge.boardY + challenge.boardH + 8 <= challenge.controlsY - 38, 'the bottle/build toolbar must not cover the bottom board row');
});

let clipped = false;
const clipStack = [];
const ctx = new Proxy({
  save() { clipStack.push(clipped); },
  restore() { clipped = clipStack.pop(); },
  clip() { clipped = true; },
  createLinearGradient: () => ({ addColorStop() {} }),
  measureText: (text) => ({ width: String(text).length * 6 }),
}, { get: (target, key) => key in target ? target[key] : () => {} });
let drawn = 0;
const scene = Object.assign(game(390, 844, 47, 810), {
  ctx, buttons: [], gameType: 'classic', score: 0, best: 0, level: 1, maxChain: 0,
  board: Array.from({ length: 12 }, () => Array(6).fill(0)), pair: null, queue: [],
  build: {}, challenge: { stage: 1 },
  rogue: { levelOf: () => 0, swapStatus: () => ({ available: 0 }) },
  visual: { boardOffset: () => ({ x: 0, y: 0 }), cellState: () => ({ offsetRows: 0, scaleX: 1, scaleY: 1, alpha: 1 }) },
  drawConnections() { assert.ok(clipped, 'board connections stay inside the board clip'); },
  drawCell() { drawn++; assert.ok(clipped, 'animated cells must be clipped to the board'); },
  drawParticles() { assert.strictEqual(clipped, true, 'particles stay inside the board too'); },
  drawEffectBanner() {},
});
scene.board[11][0] = 6;
renderer.drawGame(scene);
assert.strictEqual(drawn, 1);
assert.strictEqual(clipped, false);
assert.strictEqual(clipStack.length, 0);

console.log('wechat minigame renderer layout and clipping tests passed');
