'use strict';

const assert = require('assert');
require('./board-rules.js');
require('./challenge-effects.js');

const boardRules = global.PuyoBoardRules.create({ rows: 4, cols: 4, garbage: 6, rotations: [[0, -1], [1, 0], [0, 1], [-1, 0]] });
const adjacentGarbage = (board, cells, garbage) => {
  const found = new Map();
  cells.forEach(([x, y]) => [[1,0],[-1,0],[0,1],[0,-1]].forEach(([dx, dy]) => {
    const nx = x + dx, ny = y + dy;
    if (board[ny] && board[ny][nx] === garbage) found.set(nx + ',' + ny, [nx, ny]);
  }));
  return Array.from(found.values());
};
const challengeRules = {
  adjacentGarbage,
  resolveTurn: () => ({ state: { stage: 2, completed: 1, garbageCleared: 0 }, completed: true, reward: 2, bonus: 100, pressure: 1, entryGarbage: 0, canceled: 0 }),
  placeGarbage: (board, count) => count ? [[0, 0]] : [],
};
const rogueliteRules = {
  modifiers: () => ({ cleanerClear: 1, colorBurstThreshold: 4, colorBurstClear: 1, chainDefense: 1, largeGroupThreshold: 6, largeGroupDefense: 2, bufferReduction: 0 }),
  offer: (state) => Object.assign({}, state, { offered: true }),
  offerSpecial: (state) => state,
};
const effects = global.PuyoChallengeEffects.create({ challengeRules, rogueliteRules, boardRules, garbage: 6, rows: 4 });

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

const turnBoard = boardRules.emptyBoard();
turnBoard[3][0] = 6;
turnBoard[3][1] = 6;
turnBoard[3][2] = 6;
const result = effects.settleTurn({
  challengeState: { stage: 1 },
  runBuild: { bufferedStage: 0 },
  turnStats: { maxChain: 2, largestGroup: 6, extraDefense: 0 },
  board: turnBoard,
  random: () => 0,
});
assert.strictEqual(result.scoreBonus, 100);
assert.strictEqual(result.removed.length, 2);
assert.strictEqual(result.placed.length, 0);
assert.strictEqual(result.incomingCount, 1);
assert.deepStrictEqual(result.triggered, ['chainShield', 'largeGroup']);
assert.strictEqual(result.runBuild.offered, true);
assert.strictEqual(result.waitsForBoard, true);
assert.ok(result.message.text.includes('STAGE 1 完成'));

console.log('puyo challenge effects tests passed');
