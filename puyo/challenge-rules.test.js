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

// Garbage-pressure V1 P0 characterization: preserve the current Stage 1-15
// generation and countdown curve before changing how individual batches land.
assert.deepEqual(
  Array.from({ length: 15 }, (_, index) => rules.garbageForStage(index + 1)),
  [1, 2, 2, 3, 3, 4, 4, 5, 5, 5, 5, 5, 5, 5, 5]
);
assert.deepEqual(
  Array.from({ length: 15 }, (_, index) => rules.normalize({ completed: index }, () => 0).pressureIn),
  [10, 9, 9, 8, 8, 7, 7, 6, 6, 6, 6, 6, 6, 6, 6]
);
const occupancyBoard = Array.from({ length: 12 }, () => Array(6).fill(0));
occupancyBoard[11][0] = 1;
occupancyBoard[10][0] = rules.GARBAGE;
assert.equal(rules.boardOccupancy(occupancyBoard), 2);
assert.equal(rules.boardOccupancy(null), 0);
assert.deepEqual([43, 44, 51, 52, 72].map(rules.garbageCapForOccupancy), [4, 2, 2, 1, 1]);
assert.deepEqual([43, 44, 51, 52, 72].map(rules.deferredDelayForOccupancy), [2, 2, 2, 3, 3]);

const migratedPressure = rules.normalize({ pendingGarbage: 150, deferredGarbage: 4 }, () => 0);
assert.equal(migratedPressure.pendingGarbage, 150);
assert.equal(migratedPressure.deferredGarbage, 4);
assert.equal(migratedPressure.deferredIn, 2);
const cleanMigration = rules.normalize({ pendingGarbage: 5, deferredGarbage: 0, deferredIn: 8 }, () => 0);
assert.equal(cleanMigration.deferredGarbage, 0);
assert.equal(cleanMigration.deferredIn, 0);
assert.equal(rules.normalize({ pendingGarbage: 5000 }, () => 0).pendingGarbage, rules.MAX_GARBAGE_DEBT);

const queuedEarlier = rules.enqueueDeferred({ deferredGarbage: 2, deferredIn: 1 }, 3, 2);
assert.equal(queuedEarlier.deferredGarbage, 5);
assert.equal(queuedEarlier.deferredIn, 1);

const canceledNearest = rules.cancelGarbage({ pendingGarbage: 5, deferredGarbage: 3, deferredIn: 2 }, 4);
assert.equal(canceledNearest.canceled, 4);
assert.equal(canceledNearest.deferredCanceled, 3);
assert.equal(canceledNearest.pendingCanceled, 1);
assert.equal(canceledNearest.state.deferredGarbage, 0);
assert.equal(canceledNearest.state.deferredIn, 0);
assert.equal(canceledNearest.state.pendingGarbage, 4);

const bothAdvanced = rules.advancePressure({ pendingGarbage: 5, pressureIn: 1, deferredGarbage: 4, deferredIn: 1 });
assert.equal(bothAdvanced.deferredDue, true);
assert.equal(bothAdvanced.pendingDue, true);
assert.equal(bothAdvanced.state.deferredIn, 0);
assert.equal(bothAdvanced.state.pressureIn, 0);

const deferredFirst = rules.releaseGarbage(Object.assign({ stage: 8 }, bothAdvanced.state), 44);
assert.equal(deferredFirst.source, 'deferred');
assert.equal(deferredFirst.requested, 4);
assert.equal(deferredFirst.released, 2);
assert.equal(deferredFirst.carried, 2);
assert.equal(deferredFirst.state.deferredGarbage, 2);
assert.equal(deferredFirst.state.deferredIn, 2);
assert.equal(deferredFirst.state.pendingGarbage, 5);
assert.equal(deferredFirst.state.pressureIn, 1);
assert.equal(deferredFirst.requested, deferredFirst.released + deferredFirst.carried);

const splitRegular = rules.releaseGarbage({ stage: 8, pendingGarbage: 5, pressureIn: 0, deferredGarbage: 0 }, 52);
assert.equal(splitRegular.source, 'pending');
assert.equal(splitRegular.released, 1);
assert.equal(splitRegular.carried, 4);
assert.equal(splitRegular.state.deferredGarbage, 4);
assert.equal(splitRegular.state.deferredIn, 3);
assert.equal(splitRegular.state.pendingGarbage, rules.garbageForStage(8));
assert.equal(splitRegular.state.pressureIn, 6);
assert.equal(splitRegular.requested, splitRegular.released + splitRegular.carried);

const regularJoinsDeferred = rules.releaseGarbage({
  stage: 8,
  pendingGarbage: 5,
  pressureIn: 0,
  deferredGarbage: 2,
  deferredIn: 1,
}, 44);
assert.equal(regularJoinsDeferred.source, 'pending');
assert.equal(regularJoinsDeferred.released, 2);
assert.equal(regularJoinsDeferred.carried, 3);
assert.equal(regularJoinsDeferred.state.deferredGarbage, 5);
assert.equal(regularJoinsDeferred.state.deferredIn, 1);

const nothingDue = rules.releaseGarbage({ pendingGarbage: 5, pressureIn: 2, deferredGarbage: 3, deferredIn: 1 }, 60);
assert.equal(nothingDue.source, '');
assert.equal(nothingDue.released, 0);
assert.equal(nothingDue.state.pendingGarbage, 5);
assert.equal(nothingDue.state.deferredGarbage, 3);

assert.ok(rules.MISSION_TYPES.includes('largeGroup'));
assert.ok(rules.MISSION_TYPES.includes('targetColor'));
const generatedTypes = new Set(Array.from({ length: 9 }, (_, index) => rules.missionFor(10, () => (index + 0.1) / 9).type));
assert.deepEqual(generatedTypes, new Set(rules.MISSION_TYPES));
assert.equal(rules.normalize({ mission: { type: 'scoreTurn', target: 1000, title: '得分', progress: 750 } }).mission.progress, 750);

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
assert.equal(pressured.pressure, 0);
const pressuredRelease = rules.releaseGarbage(pressured.state, 0);
assert.equal(pressuredRelease.released, 2);
assert.equal(pressuredRelease.state.pendingGarbage, rules.garbageForStage(5));

const fullyCanceled = rules.resolveTurn({
  completed: 0,
  pressureIn: 1,
  pendingGarbage: 1,
  mission: { type: 'chain', target: 9, title: '测试', progress: 0 },
}, { maxChain: 2 }, () => 0);
assert.equal(fullyCanceled.canceled, 1);
assert.equal(fullyCanceled.pressure, 0);
assert.equal(fullyCanceled.pressureTriggered, true);

const upgradedDefense = rules.resolveTurn({ pendingGarbage: 5, pressureIn: 3 }, { maxChain: 2, extraDefense: 2 }, () => 0);
assert.equal(upgradedDefense.canceled, 3);
assert.equal(upgradedDefense.regularCanceled, 3);
assert.equal(upgradedDefense.allClearCanceled, 0);

const deferredDefense = rules.resolveTurn({
  pendingGarbage: 5,
  pressureIn: 3,
  deferredGarbage: 3,
  deferredIn: 2,
}, { maxChain: 2, extraDefense: 3 }, () => 0);
assert.equal(deferredDefense.canceled, 4);
assert.equal(deferredDefense.deferredCanceled, 3);
assert.equal(deferredDefense.pendingCanceled, 1);
assert.equal(deferredDefense.state.deferredGarbage, 0);
assert.equal(deferredDefense.state.deferredIn, 0);
assert.equal(deferredDefense.state.pendingGarbage, 4);

const allClearDefense = rules.resolveTurn({ pendingGarbage: 5, pressureIn: 3 }, { maxChain: 2, allClearDefense: 5 }, () => 0);
assert.equal(allClearDefense.regularCanceled, 1);
assert.equal(allClearDefense.allClearCanceled, 4);
assert.equal(allClearDefense.canceled, 5);

assert.equal(rules.missionProgress({ type: 'largeGroup', progress: 0 }, { largestGroup: 7 }), 7);
assert.equal(rules.missionProgress({ type: 'garbageClear', progress: 2 }, { garbageCleared: 3 }), 5);
assert.equal(rules.missionProgress({ type: 'clearStreak', progress: 1 }, { clearStreak: 2 }), 2);
assert.equal(rules.missionProgress({ type: 'scoreTurn', progress: 300 }, { scoreGained: 750 }), 750);
assert.equal(rules.missionProgress({ type: 'lowBoard', maxHeight: 5, progress: 0 }, { boardHeight: 5, clearedThisTurn: true }), 1);
assert.equal(rules.missionProgress({ type: 'lowBoard', maxHeight: 5, progress: 0 }, { boardHeight: 6, clearedThisTurn: true }), 0);
assert.equal(rules.missionProgress({ type: 'lowBoard', maxHeight: 5, progress: 0 }, { boardHeight: 0, clearedThisTurn: false }), 0);
assert.equal(rules.missionProgress({ type: 'lowBoard', maxHeight: 5, progress: 0 }, { boardHeight: null, clearedThisTurn: true }), 0);
assert.equal(rules.missionProgress({ type: 'clearStreak', progress: 2 }, { clearStreak: 0 }), 0);
assert.equal(rules.missionProgress({ type: 'targetColor', progress: 4 }, { colorClearedCount: 3 }), 7);
assert.deepEqual(rules.missionPresentation({ type: 'chain', target: 3 }, 2), { scope: '单回合', progress: '最高 2 / 3 CHAIN' });
assert.deepEqual(rules.missionPresentation({ type: 'garbageClear', target: 5 }, 2), { scope: '累计任务', progress: '已累计清除 2 / 5 颗' });
assert.deepEqual(rules.missionPresentation({ type: 'clearStreak', target: 3 }, 1), { scope: '连续任务', progress: '当前连续 1 / 3 回合' });
assert.equal(rules.missionPresentation({ type: 'lowBoard', target: 1, maxHeight: 6 }, 0).progress, '目标：消除后不超过 6 行');

const streakMission = rules.resolveTurn({
  completed: 4,
  clearStreak: 1,
  mission: { type: 'clearStreak', target: 2, title: '连续消除', progress: 1 },
}, { clearedThisTurn: true }, () => 0);
assert.equal(streakMission.completed, true);
assert.equal(streakMission.state.clearStreak, 2);

const noTriple = rules.resolveTurn({
  completed: 5,
  lastMissionType: 'chain',
  sameMissionCount: 1,
  mission: { type: 'chain', target: 2, title: '完成 2 CHAIN', progress: 0 },
}, { maxChain: 2 }, () => 0);
assert.notEqual(noTriple.state.mission.type, 'chain');

const enterSpecial = rules.resolveTurn({
  completed: 3,
  mission: { type: 'clear', target: 4, title: '测试', progress: 0 },
}, { cleared: 4, clearedThisTurn: true }, () => 0);
assert.equal(enterSpecial.enteredSpecial, true);
assert.equal(enterSpecial.state.stage, 5);
assert.equal(enterSpecial.state.special.type, 'storm');
assert.equal(enterSpecial.state.turnsLeft, 5);

const clearSpecial = rules.resolveTurn(enterSpecial.state, { garbageCleared: 4, clearedThisTurn: true }, () => 0.4);
assert.equal(clearSpecial.specialCompleted, true);
assert.equal(clearSpecial.state.stage, 6);
assert.equal(clearSpecial.state.special, null);
assert.equal(clearSpecial.bonus, 1200);

const failSpecial = rules.resolveTurn(Object.assign({}, enterSpecial.state, {
  turnsLeft: 1,
  special: { type: 'storm', title: '干扰风暴' },
  mission: { type: 'garbageClear', target: 9, title: '测试', progress: 0 },
}), { clearedThisTurn: false }, () => 0.4);
assert.equal(failSpecial.specialFailed, true);
assert.equal(failSpecial.specialPenalty, 3);
assert.equal(failSpecial.state.special, null);
assert.equal(failSpecial.state.stage, 5);
const afterFailedNormal = rules.resolveTurn(Object.assign({}, failSpecial.state, { turnsLeft: 1 }), { clearedThisTurn: false }, () => 0);
assert.equal(afterFailedNormal.state.special, null);

// P2 source isolation: a due Stage 5 batch remains separate from the newly
// generated three-garbage special failure penalty.
const combinedPressure = rules.resolveTurn({
  completed: 4,
  turnsLeft: 1,
  pressureIn: 1,
  pendingGarbage: 5,
  special: { type: 'storm', title: '干扰风暴' },
  mission: { type: 'garbageClear', target: 9, title: '测试', progress: 0 },
}, { clearedThisTurn: false, maxChain: 1 }, () => 0.4);
assert.equal(combinedPressure.specialFailed, true);
assert.equal(combinedPressure.specialPenalty, 3);
assert.equal(combinedPressure.pressureTriggered, true);
assert.equal(combinedPressure.pressure, 0);
const combinedRelease = rules.releaseGarbage(combinedPressure.state, 0);
assert.equal(combinedRelease.released, 4);
const combinedQueued = rules.enqueueDeferred(combinedRelease.state, combinedPressure.specialPenalty, 2);
assert.equal(combinedQueued.deferredGarbage, 4);
assert.equal(combinedQueued.deferredIn, 2);

const towerEntry = rules.resolveTurn({
  completed: 3,
  mission: { type: 'clear', target: 4, title: '测试', progress: 0 },
}, { cleared: 4, clearedThisTurn: true }, () => 0.99);
assert.equal(towerEntry.state.special.type, 'tower');
assert.equal(towerEntry.entryGarbage, 5);
assert.notEqual(rules.specialFor(10, () => 0, 'storm').type, 'storm');

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
assert.deepEqual(placed, [[0, 5], [0, 4], [1, 5]]);
assert.equal(empty.flat().filter((cell) => cell === rules.GARBAGE).length, 3);

console.log('challenge-rules tests passed');
