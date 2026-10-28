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
    assert.equal(layout.top, 39, 'capsule height no longer shifts the entire left header');
    assert.equal(layout.title.y, 69);
    const capsule = {x: width - 106, y: 43, w: 96, h: 36};
    layout.boxes.filter(b => ['new', 'pause', 'back'].includes(b.action)).forEach(b => assert.equal(intersects(b, capsule), false));
    game.draw();
    game.controller.action('cell:0:0');
    const before = game.controller.view().model.state;
    game.onHide(); info.menuButton = {bottom: 90}; game.onShow();
    assert.equal(game.controller.view().layout.top, 39, 'left header remains at the real safe inset');
    assert.equal(game.controller.view().layout.obstruction.y + game.controller.view().layout.obstruction.h, 90, 'foreground return remeasures only the capsule exclusion');
    assert.deepEqual(game.controller.view().model.state, before, 'remeasure never replaces progress');
    assert.equal(game.controller.view().overlay.kind, 'paused');
  }
}
const devtools = new SudokuGame({getContext: () => ctx}, {
  systemInfo: () => ({platform:'devtools',width:366,height:809,pixelRatio:2,statusBarHeight:39,safeArea:{top:39,bottom:809,left:0,right:366},menuButton:{}}),
  storage: () => ({get:(_key,fallback)=>fallback,set:()=>true}),
}, () => {});
devtools.enter();
assert.equal(devtools.controller.view().layout.top,0,'DevTools has no OS status bar drawn inside the game canvas');
assert.equal(devtools.controller.view().layout.title.y,30,'left title starts at the canvas top rather than an empty navigation band');
assert.equal(devtools.controller.view().layout.obstruction.y,8);
assert.ok(devtools.controller.view().layout.boxes.find(b=>b.action==='new').y>=52,'right tools remain below the fallback capsule');
console.log('Sudoku WeChat safe area: 32 geometry/device cases, header exclusion and foreground remeasurement passed');
