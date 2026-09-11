'use strict';

const assert = require('assert');
require('./session-state.js');

const emptyBoard = () => [[0, 0], [0, 0]];
const storage = {
  validBoard: (board) => Array.isArray(board) && board.length === 2,
  validPair: (pair) => !!pair && pair.ok === true,
  validColors: (colors) => Array.isArray(colors) && colors.length === 2,
};
const session = global.PuyoSessionState.create({
  storage,
  emptyBoard,
  challengeRules: { normalize: (state) => Object.assign({ completed: 0 }, state || {}) },
  rogueliteRules: { normalize: (state, completed) => Object.assign({ completed }, state || {}) },
});

assert.strictEqual(session.freshTurnStats().cleared, 0);
assert.strictEqual(session.freshTurnStats().allClearDefense, 0);
const snap = session.snapshot({ gameType: 'classic', board: emptyBoard(), pair: null, queue: [], score: 5, level: 1, clearedTotal: 0, runMaxChain: 0, allClearCount: 2, hiAtStart: 3, bestChainAtStart: 2 });
assert.strictEqual(snap.score, 5);
assert.strictEqual(snap.challengeState, null);
assert.ok(Number.isFinite(snap.savedAt));
assert.strictEqual(snap.allClearCount, 2);

const restored = session.restore({ gameType: 'challenge', board: [[1, 0], [0, 0]], pair: { ok: true }, queue: [[1, 2], [1]], score: -4, level: 99, clearedTotal: -3, runMaxChain: 4, challengeState: { completed: 2 }, runBuild: { pick: 1 } }, { highScore: 20, bestChain: 6 });
assert.strictEqual(restored.gameType, 'challenge');
assert.strictEqual(restored.score, 0);
assert.strictEqual(restored.level, 12);
assert.strictEqual(restored.clearedTotal, 0);
assert.deepStrictEqual(restored.queue, [[1, 2]]);
assert.strictEqual(restored.runBuild.completed, 2);
assert.strictEqual(restored.allClearCount, 0);
assert.strictEqual(restored.hiAtStart, 20);

const pendingPair = { ok: true, colors: [2, 3] };
const pending = session.prepareResume({ pair: pendingPair, queue: [[1, 2]] }, true);
assert.strictEqual(pending.needsResolution, true);
assert.strictEqual(pending.pair, null);
assert.deepStrictEqual(pending.queue, [[2, 3], [1, 2]]);
assert.notStrictEqual(pending.queue[0], pendingPair.colors);

const clean = session.prepareResume({ pair: pendingPair, queue: [[1, 2]] }, false);
assert.strictEqual(clean.needsResolution, false);
assert.strictEqual(clean.pair, pendingPair);
assert.deepStrictEqual(clean.queue, [[1, 2]]);

console.log('puyo session state tests passed');
