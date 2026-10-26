'use strict';

const assert = require('assert');
global.window = global;
require('../vendor/puyo/board-rules.js');
require('../vendor/puyo/scoring-rules.js');
require('../vendor/puyo/rotation-rules.js');
require('../vendor/puyo/challenge-rules.js');
require('../vendor/puyo/roguelite-rules.js');
require('../vendor/puyo/active-item-rules.js');
require('../vendor/puyo/challenge-effects.js');
require('../vendor/puyo/session-state.js');
require('../vendor/puyo/game-session.js');
require('../vendor/puyo/storage.js');
require('../vendor/puyo/input.js');

const context = new Proxy({
  createLinearGradient: () => ({ addColorStop() {} }),
  measureText: (text) => ({ width: String(text).length * 8 }),
}, {
  get(target, key) { return key in target ? target[key] : () => {}; },
  set(target, key, value) { target[key] = value; return true; },
});
const values = new Map();
const platform = {
  storage: () => ({ get: (key, fallback) => values.has(key) ? values.get(key) : fallback, set: (key, value) => values.set(key, value), remove: (key) => values.delete(key) }),
  audio: () => ({ isMuted: () => false, toggle() {}, start() {}, pause() {}, resume() {}, stop() {}, play() {}, haptic() {} }),
  systemInfo: () => ({ width: 390, height: 844, pixelRatio: 2, safeArea: { left: 0, top: 47, right: 390, bottom: 810 } }),
};
const PuyoGame = require('./puyo-game.js');
const game = new PuyoGame({ getContext: () => context }, platform);
game.newGame('classic');
const saved = game.controller.session.snapshot();
saved.board[11] = [1, 1, 1, 0, 0, 0];
saved.pair = { x: 3, y: 9, rot: 0, colors: [1, 2] };
game.controller.restore(saved);
game.perform('resume');
game.hardDrop();
assert.deepStrictEqual(game.board[11].slice(0, 4), [1, 1, 1, 1], 'cells remain visible until the shared pop is acknowledged');
assert.ok(game.visual.pop);
assert.strictEqual(game.controller.session.view().waitingEffect.type, 'pop');
game.update(.2);
assert.deepStrictEqual(game.board[11].slice(0, 4), [1, 1, 1, 1]);
game.onHide();
const frozen = game.controller.effect.remaining;
game.update(.5);
assert.strictEqual(game.controller.effect.remaining, frozen, 'hiding freezes effects and gameplay together');
game.onShow();
game.update(.5);
assert.strictEqual(game.controller.effect.remaining, frozen, 'returning does not auto-resume');
game.perform('resume');
game.update(.12);
assert.deepStrictEqual(game.board[11].slice(0, 4), [0, 0, 0, 2], 'gravity runs only after the pop is acknowledged');
assert.ok(game.visual.particles.length > 0);
assert.strictEqual(game.controller.session.view().waitingEffect.type, 'fall');
game.update(.3);
assert.strictEqual(game.mode, 'playing');
assert.strictEqual(game.cleared, 4);
assert.strictEqual(game.maxChain, 1);
assert.ok(game.pair);
assert.ok(game.ghostCells.length);
console.log('wechat shared-core animation flow tests passed');
