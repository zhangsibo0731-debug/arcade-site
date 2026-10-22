'use strict';

const root = typeof GameGlobal !== 'undefined' ? GameGlobal : globalThis;
root.window = root;

require('../vendor/puyo/board-rules.js');
require('../vendor/puyo/scoring-rules.js');
require('../vendor/puyo/rotation-rules.js');
require('../vendor/puyo/challenge-rules.js');
require('../vendor/puyo/roguelite-rules.js');
require('../vendor/puyo/active-item-rules.js');
require('../vendor/puyo/challenge-effects.js');

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
