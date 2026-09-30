'use strict';

const assert = require('assert');
global.window = global;
require('./board-rules.js');
require('./challenge-rules.js');
require('./challenge-effects.js');

const boardRules = global.PuyoBoardRules.create({ rows: 4, cols: 4, garbage: 6, rotations: [[0, -1], [1, 0], [0, 1], [-1, 0]] });
const largeBoardRules = global.PuyoBoardRules.create({ rows: 12, cols: 6, garbage: 6, rotations: [[0, -1], [1, 0], [0, 1], [-1, 0]] });
const adjacentGarbage = (board, cells, garbage) => {
  const found = new Map();
  cells.forEach(([x, y]) => [[1,0],[-1,0],[0,1],[0,-1]].forEach(([dx, dy]) => {
    const nx = x + dx, ny = y + dy;
    if (board[ny] && board[ny][nx] === garbage) found.set(nx + ',' + ny, [nx, ny]);
  }));
  return Array.from(found.values());
};
const challengeRules = Object.assign({}, global.PuyoChallengeRules, {
  adjacentGarbage,
  resolveTurn: () => ({
    state: { stage: 2, completed: 1, garbageCleared: 0, pendingGarbage: 1, pressureIn: 0, deferredGarbage: 0, deferredIn: 0 },
    completed: true,
    reward: 2,
    bonus: 100,
    pressureTriggered: true,
    entryGarbage: 0,
    regularGarbage: 0,
    canceled: 0,
  }),
});
const rogueliteRules = {
  modifiers: () => ({ cleanerClear: 1, colorBurstThreshold: 4, colorBurstClear: 1, chainDefense: 1, largeGroupThreshold: 6, largeGroupDefense: 2, bufferReduction: 0 }),
  resolveTurnUpgrades: (state) => ({ state, extraDefense: 3, scoreBonus: 0, triggered: ['chainShield', 'largeGroup'] }),
  offer: (state) => Object.assign({}, state, { offered: true }),
  offerRelic: (state) => state,
  offerBonus: (state) => state,
  offerContract: (state) => state,
  resolveContract: (state) => ({ state, rewarded: false }),
};
const activeItemRules = {
  MIX_BOTTLE: 'mixBottle',
  normalize: (state) => state || { inventory: { mixBottle: 0 }, armedItem: '' },
  grant: (state) => {
    const before = state.inventory.mixBottle;
    const next = Math.min(2, before + 1);
    return { state: { inventory: { mixBottle: next }, armedItem: state.armedItem || '' }, granted: next - before, full: next === 2 };
  },
};
const effects = global.PuyoChallengeEffects.create({ challengeRules, rogueliteRules, activeItemRules, boardRules, garbage: 6, rows: 4 });

const clearBoard = boardRules.emptyBoard();
clearBoard[3] = [1, 1, 1, 1];
clearBoard[2][0] = 6;
clearBoard[0][3] = 6;
clearBoard[0][2] = 6;
clearBoard[3][3] = 6;
const cells = [[0,3],[1,3],[2,3],[3,3]];
const clear = effects.resolveClear({ active: true, board: clearBoard, cells, groups: [{ color: 1, cells }], modifiers: rogueliteRules.modifiers({}) });
assert.strictEqual(clear.garbageCells.length, 4);
assert.deepStrictEqual(clear.triggered, ['cleaner', 'colorBurst']);
assert.strictEqual(clear.remoteLinks.length, 1);
assert.strictEqual(clear.cleanerUsed, true);

const cleanerModifiers = { cleanerClear: 1, colorBurstThreshold: 0, colorBurstClear: 0 };
const firstChainClear = effects.resolveClear({ active: true, board: clearBoard, cells, groups: [{ color: 1, cells }], modifiers: cleanerModifiers, cleanerUsed: false });
assert.strictEqual(firstChainClear.garbageCells.length, 3);
assert.deepStrictEqual(firstChainClear.triggered, ['cleaner']);
assert.strictEqual(firstChainClear.cleanerUsed, true);
const laterChainClear = effects.resolveClear({ active: true, board: clearBoard, cells, groups: [{ color: 1, cells }], modifiers: cleanerModifiers, cleanerUsed: firstChainClear.cleanerUsed });
assert.strictEqual(laterChainClear.garbageCells.length, 2);
assert.deepStrictEqual(laterChainClear.triggered, []);
assert.strictEqual(laterChainClear.cleanerUsed, true);

const noAdjacentBoard = boardRules.emptyBoard();
noAdjacentBoard[0][3] = 6;
const delayedCleaner = effects.resolveClear({ active: true, board: noAdjacentBoard, cells, groups: [{ color: 1, cells }], modifiers: cleanerModifiers, cleanerUsed: false });
assert.strictEqual(delayedCleaner.cleanerUsed, false);

const rewardChainClear = effects.resolveClear({ active: true, board: clearBoard, cells, groups: [{ color: 1, cells }], modifiers: rogueliteRules.modifiers({}), cleanerUsed: false, allowCleaner: false });
assert.strictEqual(rewardChainClear.garbageCells.length, 3);
assert.deepStrictEqual(rewardChainClear.triggered, ['colorBurst']);
assert.strictEqual(rewardChainClear.remoteLinks.length, 1);
assert.strictEqual(rewardChainClear.cleanerUsed, false);

const sturdyBoardRules = global.PuyoBoardRules.create({ rows: 4, cols: 4, garbage: 6, isGarbage: global.PuyoChallengeRules.isGarbage, rotations: [[0, -1], [1, 0], [0, 1], [-1, 0]] });
const sturdyEffects = global.PuyoChallengeEffects.create({ challengeRules: global.PuyoChallengeRules, rogueliteRules, activeItemRules, boardRules: sturdyBoardRules, garbage: 6, rows: 4 });
const sturdyBoard = sturdyBoardRules.emptyBoard();
sturdyBoard[3] = [1, 1, 1, 1];
sturdyBoard[2][0] = global.PuyoChallengeRules.STURDY_GARBAGE;
sturdyBoard[2][3] = global.PuyoChallengeRules.CRACKED_GARBAGE;
const sturdyClear = sturdyEffects.resolveClear({ active: true, board: sturdyBoard, cells, groups: [{ color: 1, cells }], modifiers: { cleanerClear: 0, colorBurstThreshold: 0, colorBurstClear: 0 }, cleanerUsed: false });
assert.deepStrictEqual(sturdyClear.garbageHits.map((hit) => [hit.from, hit.to, hit.destroyed]), [[7, 8, false], [8, 0, true]]);
assert.strictEqual(sturdyClear.destroyedGarbage, 1);

const turnBoard = boardRules.emptyBoard();
turnBoard[3][0] = 6;
turnBoard[3][1] = 6;
turnBoard[3][2] = 6;
const result = effects.settleTurn({
  challengeState: { stage: 1 },
  runBuild: { bufferedStage: 0 },
  itemState: { inventory: { mixBottle: 1 }, armedItem: '' },
  turnStats: { maxChain: 2, largestGroup: 6, extraDefense: 0 },
  board: turnBoard,
  random: () => 0,
});
assert.strictEqual(result.scoreBonus, 100);
assert.strictEqual(result.removed.length, 2);
assert.strictEqual(result.rewardCount, 2);
assert.strictEqual(result.placed.length, 0);
assert.strictEqual(result.incomingCount, 0);
assert.strictEqual(result.deferredByReward, 1);
assert.strictEqual(result.challengeState.deferredGarbage, 1);
assert.strictEqual(result.challengeState.deferredIn, 1);
assert.deepStrictEqual(result.triggered, ['chainShield', 'largeGroup']);
assert.strictEqual(result.runBuild.offered, true);
assert.strictEqual(result.waitsForBoard, true);
assert.ok(result.message.text.includes('阶段 1 完成'));

function completionEffects(specialCompleted) {
  const occupancyRules = Object.assign({}, global.PuyoChallengeRules, {
    resolveTurn: () => ({
      state: { stage: 9, completed: 8, garbageCleared: 0, pendingGarbage: 0, pressureIn: 2, deferredGarbage: 0, deferredIn: 0 },
      completed: true,
      specialCompleted: !!specialCompleted,
      reward: 2,
      bonus: 100,
      pressureTriggered: false,
      entryGarbage: 0,
      regularGarbage: 0,
      canceled: 0,
    }),
  });
  return global.PuyoChallengeEffects.create({ challengeRules: occupancyRules, rogueliteRules, activeItemRules, boardRules: largeBoardRules, garbage: 6, rows: 12 });
}

function boardWithGarbage(count) {
  const nextBoard = largeBoardRules.emptyBoard();
  for (let index = 0; index < count; index++) nextBoard[11 - Math.floor(index / 6)][index % 6] = 6;
  return nextBoard;
}

function settleCompletion(count, specialCompleted) {
  return completionEffects(specialCompleted).settleTurn({
    challengeState: { stage: 8 },
    runBuild: { bufferedStage: 0 },
    itemState: { inventory: { mixBottle: 0 }, armedItem: '' },
    turnStats: { maxChain: 1, extraDefense: 0 },
    board: boardWithGarbage(count),
    random: () => 0,
  });
}

assert.strictEqual(settleCompletion(43, false).removed.length, 2);
assert.strictEqual(settleCompletion(44, false).removed.length, 3);
assert.strictEqual(settleCompletion(52, false).removed.length, 4);
assert.strictEqual(settleCompletion(43, true).removed.length, 3);
assert.strictEqual(settleCompletion(44, true).removed.length, 4);
assert.strictEqual(settleCompletion(52, true).removed.length, 4);

const specialRules = Object.assign({}, challengeRules, {
  resolveTurn: () => ({
    state: { stage: 6, completed: 5, garbageCleared: 0, pendingGarbage: 0, pressureIn: 4, deferredGarbage: 0, deferredIn: 0, special: null },
    completed: true,
    specialCompleted: true,
    reward: 0,
    bonus: 1200,
    pressureTriggered: false,
    entryGarbage: 0,
    regularGarbage: 0,
    canceled: 0,
  }),
});
const specialEffects = global.PuyoChallengeEffects.create({ challengeRules: specialRules, rogueliteRules, activeItemRules, boardRules, garbage: 6, rows: 4 });
const specialResult = specialEffects.settleTurn({
  challengeState: { stage: 5 },
  runBuild: { bufferedStage: 0 },
  itemState: { inventory: { mixBottle: 1 }, armedItem: '' },
  turnStats: { maxChain: 2, extraDefense: 0 },
  board: boardRules.emptyBoard(),
  random: () => 0,
});
assert.strictEqual(specialResult.itemState.inventory.mixBottle, 2);
assert.strictEqual(specialResult.itemReward.granted, 1);
assert.ok(specialResult.message.text.includes('混色瓶 +1'));

const fullSpecialResult = specialEffects.settleTurn({
  challengeState: { stage: 5 },
  runBuild: { bufferedStage: 0 },
  itemState: { inventory: { mixBottle: 2 }, armedItem: '' },
  turnStats: { maxChain: 2, extraDefense: 0 },
  board: boardRules.emptyBoard(),
  random: () => 0,
});
assert.strictEqual(fullSpecialResult.itemState.inventory.mixBottle, 2);
assert.strictEqual(fullSpecialResult.itemReward.granted, 0);
assert.ok(fullSpecialResult.message.text.includes('混色瓶已满'));

const pressureRules = Object.assign({}, global.PuyoChallengeRules, {
  resolveTurn: () => ({
    state: { stage: 8, completed: 7, garbageCleared: 0, pendingGarbage: 5, pressureIn: 0, deferredGarbage: 0, deferredIn: 0 },
    completed: false,
    reward: 0,
    bonus: 0,
    pressureTriggered: true,
    specialPenalty: 3,
    entryGarbage: 0,
    regularGarbage: 0,
    canceled: 0,
  }),
});
const pressureEffects = global.PuyoChallengeEffects.create({ challengeRules: pressureRules, rogueliteRules, activeItemRules, boardRules: largeBoardRules, garbage: 6, rows: 12 });
const crowdedBoard = largeBoardRules.emptyBoard();
let crowdedCells = 0;
for (let y = 11; y >= 0 && crowdedCells < 52; y--) {
  for (let x = 0; x < 6 && crowdedCells < 52; x++) {
    crowdedBoard[y][x] = 1;
    crowdedCells++;
  }
}
const pressureResult = pressureEffects.settleTurn({
  challengeState: { stage: 8 },
  runBuild: { bufferedStage: 0 },
  itemState: { inventory: { mixBottle: 1 }, armedItem: '' },
  turnStats: { maxChain: 1, extraDefense: 0 },
  board: crowdedBoard,
  random: () => 0,
});
assert.strictEqual(pressureResult.occupancy, 52);
assert.strictEqual(pressureResult.occupancyTier, 'critical');
assert.strictEqual(pressureResult.requestedGarbage, 1);
assert.strictEqual(pressureResult.placed.length, 1);
assert.strictEqual(pressureResult.carriedGarbage, 4);
assert.strictEqual(pressureResult.releaseSource, 'pending');
assert.strictEqual(pressureResult.challengeState.deferredGarbage, 7);
assert.strictEqual(pressureResult.challengeState.deferredIn, 3);
assert.ok(pressureResult.message.text.includes('干扰落下 × 1'));

function settleOpenPressure(stage, count) {
  const typedPressureRules = Object.assign({}, global.PuyoChallengeRules, {
    resolveTurn: () => ({
      state: { stage, completed: stage - 1, garbageCleared: 0, pendingGarbage: count, pressureIn: 0, deferredGarbage: 0, deferredIn: 0 },
      completed: false,
      reward: 0,
      bonus: 0,
      pressureTriggered: true,
      specialPenalty: 0,
      entryGarbage: 0,
      regularGarbage: 0,
      canceled: 0,
    }),
  });
  const typedEffects = global.PuyoChallengeEffects.create({ challengeRules: typedPressureRules, rogueliteRules, activeItemRules, boardRules: largeBoardRules, garbage: 6, rows: 12 });
  const typedBoard = largeBoardRules.emptyBoard();
  const typedResult = typedEffects.settleTurn({
    challengeState: { stage },
    runBuild: { bufferedStage: 0 },
    itemState: { inventory: { mixBottle: 0 }, armedItem: '' },
    turnStats: { maxChain: 1, extraDefense: 0 },
    board: typedBoard,
    random: () => 0,
  });
  return { result: typedResult, board: typedBoard };
}

const stageEightPressure = settleOpenPressure(8, 4);
assert.deepStrictEqual(stageEightPressure.result.incomingValues.sort(), [6, 6, 6, 7]);
assert.strictEqual(stageEightPressure.board.flat().filter((cell) => cell === 7).length, 1);
const stageFifteenPressure = settleOpenPressure(15, 4);
assert.deepStrictEqual(stageFifteenPressure.result.incomingValues.sort(), [6, 6, 7, 7]);
assert.strictEqual(stageFifteenPressure.board.flat().filter((cell) => cell === 7).length, 2);

const bufferedRogueliteRules = Object.assign({}, rogueliteRules, {
  modifiers: () => ({ cleanerClear: 0, colorBurstThreshold: 0, colorBurstClear: 0, bufferReduction: 3 }),
  resolveTurnUpgrades: (state) => ({ state, extraDefense: 0, scoreBonus: 0, triggered: [] }),
});
const bufferedEffects = global.PuyoChallengeEffects.create({ challengeRules: pressureRules, rogueliteRules: bufferedRogueliteRules, activeItemRules, boardRules: largeBoardRules, garbage: 6, rows: 12 });
const bufferBoard = largeBoardRules.emptyBoard();
for (let index = 0; index < 52; index++) bufferBoard[11 - Math.floor(index / 6)][index % 6] = 1;
const bufferedResult = bufferedEffects.settleTurn({
  challengeState: { stage: 8 },
  runBuild: { bufferedStage: 0 },
  itemState: { inventory: { mixBottle: 1 }, armedItem: '' },
  turnStats: { maxChain: 1, extraDefense: 0 },
  board: bufferBoard,
  random: () => 0,
});
assert.strictEqual(bufferedResult.requestedGarbage, 1);
assert.strictEqual(bufferedResult.buffered, 1);
assert.strictEqual(bufferedResult.incomingCount, 0);
assert.strictEqual(bufferedResult.placed.length, 0);
assert.strictEqual(bufferedResult.challengeState.deferredGarbage, 7);
assert.strictEqual(bufferedResult.runBuild.bufferedStage, 8);

console.log('puyo challenge effects tests passed');
