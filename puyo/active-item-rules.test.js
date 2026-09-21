'use strict';

const assert = require('node:assert/strict');
global.window = global;
require('./board-rules.js');
require('./active-item-rules.js');

const rules = global.PuyoActiveItemRules;
assert.equal(rules.initialState().inventory.mixBottle, 1);
assert.equal(rules.normalize({ inventory: { mixBottle: 99 }, armedItem: 'mixBottle' }).inventory.mixBottle, 2);
assert.equal(rules.normalize({ inventory: { mixBottle: 0 }, armedItem: 'mixBottle' }).armedItem, '');

let state = rules.initialState();
let toggle = rules.toggleMixBottle(state, true);
assert.equal(toggle.armed, true);
assert.equal(toggle.state.inventory.mixBottle, 1);
toggle = rules.toggleMixBottle(toggle.state, true);
assert.equal(toggle.armed, false);
assert.equal(toggle.state.inventory.mixBottle, 1);
assert.equal(rules.toggleMixBottle(rules.emptyState(), true).changed, false);

const board = [
  [1, 0, 6, 2],
  [1, 1, 3, 2],
  [1, 4, 5, 2],
];
const armed = rules.toggleMixBottle(rules.initialState(), true).state;
const values = [0.25, 0.99];
const applied = rules.applyMixBottle(armed, board, 5, () => values.shift());
assert.equal(applied.applied, true);
assert.equal(applied.sourceColor, 1, 'weighted draw should select a color through its occupied cells');
assert.equal(applied.targetColor, 5);
assert.equal(applied.changedCells.length, 4);
assert.equal(applied.state.inventory.mixBottle, 0);
assert.equal(applied.state.armedItem, '');
assert.equal(applied.board[0][2], 6, 'garbage must not change');
assert.equal(applied.board[0][1], 0, 'empty cells must not change');
assert.equal(board[0][0], 1, 'the input board must remain immutable');
const boardRules = global.PuyoBoardRules.create({ rows: 3, cols: 4, garbage: 6, rotations: [[0, -1], [1, 0], [0, 1], [-1, 0]] });
assert.ok(boardRules.findClearGroups(applied.board).some((group) => group.color === 5 && group.cells.length >= 4), 'recoloring must feed the normal clear detector');

const limited = rules.applyMixBottle(
  rules.toggleMixBottle(rules.initialState(), true).state,
  [[4, 4], [1, 0]],
  4,
  () => 0.999999,
);
assert.ok(limited.targetColor >= 1 && limited.targetColor <= 4);
assert.notEqual(limited.sourceColor, limited.targetColor);

const noCells = rules.applyMixBottle(
  rules.toggleMixBottle(rules.initialState(), true).state,
  [[0, 6]],
  4,
  () => 0,
);
assert.equal(noCells.applied, false);
assert.equal(noCells.state.inventory.mixBottle, 1);
assert.equal(noCells.state.armedItem, '');

const full = rules.grant({ inventory: { mixBottle: 2 } }, 'mixBottle', 1);
assert.equal(full.granted, 0);
assert.equal(full.full, true);

console.log('puyo active item rules tests passed');
