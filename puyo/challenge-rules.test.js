'use strict';

const assert = require('node:assert/strict');
global.window = global;
require('./challenge-rules.js');

const rules = global.PuyoChallengeRules;

const initial = rules.normalize({}, () => 0);
assert.equal(initial.stage, 1);
assert.equal(initial.mission.type, 'chain');
assert.equal(initial.turnsLeft, 8);

const complete = rules.resolveTurn(initial, { maxChain: 2, cleared: 8, maxColors: 1 }, () => 0);
assert.equal(complete.completed, true);
assert.equal(complete.state.completed, 1);
assert.equal(complete.bonus, 120);
assert.ok(complete.reward >= 2);

let expiring = rules.normalize({ turnsLeft: 1, mission: { type: 'chain', target: 3, title: '完成 3 CHAIN', progress: 0 } }, () => 0);
expiring = rules.resolveTurn(expiring, { maxChain: 1 }, () => 0);
assert.equal(expiring.expired, true);
assert.equal(expiring.pressure, 0);
assert.ok(expiring.state.turnsLeft >= 6);

const board = Array.from({ length: 6 }, () => Array(4).fill(0));
board[5][1] = 1;
board[5][2] = rules.GARBAGE;
board[4][1] = rules.GARBAGE;
const adjacent = rules.adjacentGarbage(board, [[1, 5]], rules.GARBAGE);
assert.deepEqual(adjacent.sort(), [[1, 4], [2, 5]].sort());

const removed = rules.removeGarbage(board, 1, rules.GARBAGE);
assert.equal(removed.length, 1);
assert.equal(board.flat().filter((cell) => cell === rules.GARBAGE).length, 1);

const empty = Array.from({ length: 6 }, () => Array(4).fill(0));
const placed = rules.placeGarbage(empty, 3, () => 0, rules.GARBAGE);
assert.equal(placed.length, 3);
assert.equal(empty.flat().filter((cell) => cell === rules.GARBAGE).length, 3);

console.log('challenge-rules tests passed');
