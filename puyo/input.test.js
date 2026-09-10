'use strict';

const assert = require('assert');
require('./input.js');

assert.strictEqual(global.PuyoInput.actionForKey('ArrowLeft'), 'left');
assert.strictEqual(global.PuyoInput.actionForKey('X'), 'cw');
assert.strictEqual(global.PuyoInput.actionForKey('z'), 'ccw');
assert.strictEqual(global.PuyoInput.actionForKey(' '), 'drop');
assert.strictEqual(global.PuyoInput.actionForKey('q'), null);
assert.strictEqual(global.PuyoInput.swipeAction({ x: 0, y: 0 }, { x: 5, y: 4 }), 'cw');
assert.strictEqual(global.PuyoInput.swipeAction({ x: 40, y: 0 }, { x: 0, y: 5 }), 'left');
assert.strictEqual(global.PuyoInput.swipeAction({ x: 0, y: 0 }, { x: 2, y: 60 }), 'drop');
assert.strictEqual(global.PuyoInput.swipeAction({ x: 0, y: 0 }, { x: 2, y: 25 }), 'down');

console.log('puyo input tests passed');
