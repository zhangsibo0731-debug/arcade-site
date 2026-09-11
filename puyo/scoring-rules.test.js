'use strict';

const assert = require('assert');
require('./scoring-rules.js');

const rules = global.PuyoScoringRules;

assert.deepStrictEqual(
  Array.from({ length: 19 }, (_, index) => rules.chainPower(index + 1)),
  [0, 8, 16, 32, 64, 96, 128, 160, 192, 224, 256, 288, 320, 352, 384, 416, 448, 480, 512]
);
assert.deepStrictEqual(
  Array.from({ length: 6 }, (_, colorCount) => rules.colorBonus(colorCount)),
  [0, 0, 3, 6, 12, 24]
);
assert.deepStrictEqual(
  [4, 5, 6, 7, 8, 9, 10, 11, 20].map(rules.groupBonus),
  [0, 2, 3, 4, 5, 6, 7, 10, 10]
);
assert.deepStrictEqual([0, 1, 10, -2].map(rules.dropScore), [0, 1, 10, 0]);
assert.deepStrictEqual(rules.allClearResult({ board: [[0, 0], [0, 0]], playerCleared: true, challenge: false }), { triggered: true, score: 2100, defense: 0 });
assert.deepStrictEqual(rules.allClearResult({ board: [[0, 0], [0, 0]], playerCleared: true, challenge: true, pendingGarbage: 9 }), { triggered: true, score: 2100, defense: 5 });
assert.strictEqual(rules.allClearResult({ board: [[0, 0]], playerCleared: false, challenge: true, pendingGarbage: 5 }).triggered, false);
assert.strictEqual(rules.allClearResult({ board: [[0, 6]], playerCleared: true, challenge: true, pendingGarbage: 5 }).triggered, false);

assert.deepStrictEqual(rules.calculate({
  chain: 1,
  colorCount: 1,
  groupSizes: [4],
  clearedCount: 4,
}), {
  chainPower: 0,
  colorBonus: 0,
  sizeBonus: 0,
  coefficient: 1,
  baseScore: 40,
  score: 40,
});

const twoColorClear = rules.calculate({ chain: 1, colorCount: 2, groupSizes: [4, 4], clearedCount: 8 });
assert.strictEqual(twoColorClear.coefficient, 3);
assert.strictEqual(twoColorClear.score, 240);
assert.strictEqual(rules.calculate({ chain: 2, colorCount: 1, groupSizes: [4], clearedCount: 4 }).score, 320);
assert.strictEqual(rules.calculate({ chain: 3, colorCount: 1, groupSizes: [4], clearedCount: 4, scoreMultiplier: 1.5 }).score, 960);
assert.strictEqual(rules.calculate({ chain: 19, colorCount: 5, groupSizes: Array(60).fill(11), clearedCount: 60 }).coefficient, 999);

console.log('puyo scoring rules tests passed');
