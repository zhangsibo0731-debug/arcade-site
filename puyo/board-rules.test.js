'use strict';

const assert = require('assert');
require('./board-rules.js');

const rules = global.PuyoBoardRules.create({
  rows: 6,
  cols: 4,
  garbage: 6,
  rotations: [[0, -1], [1, 0], [0, 1], [-1, 0]],
});

const empty = rules.emptyBoard();
assert.deepStrictEqual(empty, Array.from({ length: 6 }, () => [0, 0, 0, 0]));
assert.deepStrictEqual(rules.pairCells({ colors: [2, 4] }, 1, 2, 1), [
  { x: 1, y: 2, color: 2 },
  { x: 2, y: 2, color: 4 },
]);
assert.strictEqual(rules.collides(empty, { colors: [1, 2] }, 0, 0, 3), true);
assert.strictEqual(rules.collides(empty, { colors: [1, 2] }, 1, 0, 3), false);

const groupsBoard = rules.emptyBoard();
groupsBoard[5] = [1, 1, 1, 1];
groupsBoard[4][0] = 6;
groupsBoard[3][3] = 2;
assert.deepStrictEqual(rules.findClearGroups(groupsBoard).map((group) => [group.color, group.cells.length]), [[1, 4]]);

const uneven = rules.emptyBoard();
uneven[2][0] = 1;
uneven[2][1] = 2;
uneven[5][1] = 3;
const settled = rules.applyGravity(uneven, true);
assert.strictEqual(settled.board[5][0], 1);
assert.strictEqual(settled.board[4][1], 2);
assert.strictEqual(settled.board[5][1], 3);
assert.strictEqual(settled.offsets.get('0,5'), 3);
assert.strictEqual(settled.offsets.get('1,4'), 2);

const garbageBoard = rules.emptyBoard();
garbageBoard[5][0] = 6;
garbageBoard[5][3] = 6;
garbageBoard[1][1] = 6;
assert.deepStrictEqual(rules.garbageCandidates(garbageBoard, new Set(), [[0, 4]]), [[0, 5], [3, 5], [1, 1]]);
assert.strictEqual(rules.groupBonus(4), 0);
assert.strictEqual(rules.groupBonus(7), 4);
assert.strictEqual(rules.groupBonus(11), 10);

console.log('puyo board rules tests passed');
