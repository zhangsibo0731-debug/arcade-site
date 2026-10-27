'use strict';
const assert = require('node:assert/strict');
const SudokuGame = require('./sudoku-game.js');
const ctx = new Proxy({measureText: text => ({width: String(text).length * 8})}, {
  get: (object, key) => key in object ? object[key] : () => {},
  set: (object, key, value) => {object[key] = value; return true;},
});
const intersects = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
for (const [width, height] of [[320, 568], [366, 809], [390, 844], [430, 932]]) {
  for (const menuButton of [null, {}, {bottom: undefined}, {bottom: NaN}, {bottom: 0}, {bottom: -1}, {bottom: height + 100}, {bottom: 79}]) {
    const values = new Map();
    const info = {width, height, pixelRatio: 2, statusBarHeight: 39, safeArea: {top: 39, bottom: height - 34, left: 0, right: width}, menuButton};
    const game = new SudokuGame({getContext: () => ctx}, {
      systemInfo: () => info,
      storage: () => ({get: (key, fallback) => values.has(key) ? values.get(key) : fallback, set: (key, value) => {values.set(key, value); return true;}}),
    }, () => {});
    game.enter();
    const layout = game.controller.view().layout;
    assert.equal(layout.top, 87, 'empty/invalid responses reserve the navigation band');
    const capsule = {x: width - 106, y: 43, w: 96, h: 36};
    layout.boxes.filter(b => ['new', 'pause', 'back'].includes(b.action)).forEach(b => assert.equal(intersects(b, capsule), false));
    game.draw();
    game.controller.action('cell:0:0');
    const before = game.controller.view().model.state;
    game.onHide(); info.menuButton = {bottom: 90}; game.onShow();
    assert.equal(game.controller.view().layout.top, 98, 'foreground return remeasures capsule geometry');
    assert.deepEqual(game.controller.view().model.state, before, 'remeasure never replaces progress');
    assert.equal(game.controller.view().overlay.kind, 'paused');
  }
}
console.log('Sudoku WeChat safe area: 32 geometry/device cases, header exclusion and foreground remeasurement passed');
