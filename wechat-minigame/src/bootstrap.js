'use strict';

const root = typeof GameGlobal !== 'undefined' ? GameGlobal : globalThis;
// DevTools already exposes window as a read-only getter. Only provide the
// browser alias on runtimes that do not have one (for the shared rule modules).
if (typeof root.window === 'undefined') root.window = root;

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
require('../vendor/puyo/audio.js');

const platform = require('./platform.js');
const PuyoGame = require('./puyo-game.js');

const canvas = wx.createCanvas();
if (typeof root.requestAnimationFrame !== 'function' && typeof canvas.requestAnimationFrame === 'function') {
  root.requestAnimationFrame = canvas.requestAnimationFrame.bind(canvas);
}
const game = new PuyoGame(canvas, platform);
game.start();

wx.onHide(() => game.onHide());
wx.onShow(() => game.onShow());

module.exports = game;
