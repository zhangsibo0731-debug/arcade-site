'use strict';

const assert = require('node:assert/strict');
global.window = global;
require('./challenge-rules.js');

const rules = global.PuyoChallengeRules;

const initial = rules.normalize({}, () => 0);
assert.equal(initial.stage, 1);
assert.equal(initial.mission.type, 'chain');
assert.equal(initial.turnsLeft, 8);
assert.equal(initial.pendingGarbage, 1);
assert.equal(rules.defenseForChain(1), 0);
assert.equal(rules.defenseForChain(2), 1);
assert.equal(rules.defenseForChain(3), 3);
assert.equal(rules.defenseForChain(4), 6);
assert.equal(rules.defenseForChain(5), 8);

const complete = rules.resolveTurn(initial, { maxChain: 2, cleared: 8, maxColors: 1 }, () => 0);
assert.equal(complete.completed, true);
assert.equal(complete.state.completed, 1);
assert.equal(complete.state.stage, 2);
assert.equal(complete.bonus, 120);
assert.ok(complete.reward >= 2);
assert.equal(complete.canceled, 1);
assert.equal(complete.state.pendingGarbage, 0);

const second = rules.resolveTurn(complete.state, { maxChain: 2, cleared: 20, maxColors: 2 }, () => 0);
assert.equal(second.completed, true);
assert.equal(second.state.completed, 2);
assert.equal(second.state.stage, 3);
assert.equal(second.bonus, 240);

let expiring = rules.normalize({ turnsLeft: 1, mission: { type: 'chain', target: 3, title: '完成 3 CHAIN', progress: 0 } }, () => 0);
expiring = rules.resolveTurn(expiring, { maxChain: 1 }, () => 0);
assert.equal(expiring.expired, true);
assert.equal(expiring.pressure, 0);
assert.ok(expiring.state.turnsLeft >= 6);

const pressured = rules.resolveTurn({
  completed: 4,
  pressureIn: 1,
  pendingGarbage: 5,
  mission: { type: 'chain', target: 9, title: '测试', progress: 0 },
}, { maxChain: 3 }, () => 0);
assert.equal(pressured.canceled, 3);
assert.equal(pressured.pressureTriggered, true);
assert.equal(pressured.pressure, 2);
assert.equal(pressured.state.pendingGarbage, rules.garbageForStage(5));

const fullyCanceled = rules.resolveTurn({
  completed: 0,
  pressureIn: 1,
  pendingGarbage: 1,
  mission: { type: 'chain', target: 9, title: '测试', progress: 0 },
}, { maxChain: 2 }, () => 0);
assert.equal(fullyCanceled.canceled, 1);
assert.equal(fullyCanceled.pressure, 0);
assert.equal(fullyCanceled.pressureTriggered, true);

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
