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

const PuyoGame = require('./puyo-game.js');
const values = new Map();
const context = new Proxy({
  createLinearGradient: () => ({ addColorStop() {} }),
  measureText: (text) => ({ width: String(text).length * 8 }),
}, {
  get(target, key) { return key in target ? target[key] : () => {}; },
  set(target, key, value) { target[key] = value; return true; },
});
const platform = {
  storage: () => ({ get: (key, fallback) => values.has(key) ? values.get(key) : fallback, set: (key, value) => { values.set(key, value); }, remove: (key) => values.delete(key) }),
  audio: () => ({ isMuted: () => false, toggle() {}, start() {}, pause() {}, resume() {}, stop() {} }),
  systemInfo: () => ({ width: 390, height: 844, pixelRatio: 2, safeArea: { left: 0, top: 47, right: 390, bottom: 810 } }),
};
const canvas = { width: 0, height: 0, getContext: () => context };
const game = new PuyoGame(canvas, platform);
game.newGame('challenge');
assert.strictEqual(game.gameType, 'challenge');
assert.strictEqual(game.mode, 'playing');
assert.ok(game.pair);
game.perform('bottle');
assert.strictEqual(game.itemState.armedItem, global.PuyoActiveItemRules.MIX_BOTTLE);
game.save();
assert.ok(values.get('moonlit_puyo_minigame_v1'));
assert.doesNotThrow(() => game.draw());
game.perform('pause');
assert.strictEqual(game.mode, 'paused');
game.perform('resume');
assert.strictEqual(game.mode, 'playing');

console.log('wechat minigame puyo tests passed');
