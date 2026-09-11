'use strict';

const assert = require('node:assert/strict');

global.window = global;
const values = new Map();
global.localStorage = {
  getItem(key) { return values.has(key) ? values.get(key) : null; },
  setItem(key, value) { values.set(key, String(value)); },
  removeItem(key) { values.delete(key); },
};

require('./challenge-rules.js');
require('./roguelite-rules.js');
require('./board-rules.js');
require('./storage.js');
require('./session-state.js');
require('./challenge-effects.js');

const rows = 12;
const cols = 6;
const garbage = global.PuyoChallengeRules.GARBAGE;
const rotations = [[0, -1], [1, 0], [0, 1], [-1, 0]];
const keys = {
  highScore: { classic: 'test_hi_classic', challenge: 'test_hi_challenge' },
  bestChain: { classic: 'test_chain_classic', challenge: 'test_chain_challenge' },
  save: { classic: 'test_save_classic', challenge: 'test_save_challenge' },
  muted: 'test_muted',
};
const storage = global.PuyoStorage.create({ rows, cols, garbage, colorCount: 5, rotationCount: 4, keys });
const boardRules = global.PuyoBoardRules.create({ rows, cols, garbage, rotations });
const session = global.PuyoSessionState.create({
  storage,
  challengeRules: global.PuyoChallengeRules,
  rogueliteRules: global.PuyoRogueliteRules,
  emptyBoard: boardRules.emptyBoard,
});

// Classic and challenge saves remain isolated; newest valid save wins.
const classicSnapshot = session.snapshot({
  gameType: 'classic', board: boardRules.emptyBoard(), pair: { x: 2, y: 1, rot: 0, colors: [1, 2] },
  queue: [[3, 4]], score: 120, level: 2, clearedTotal: 35, runMaxChain: 2, hiAtStart: 100, bestChainAtStart: 1,
});
classicSnapshot.savedAt = 100;
storage.save('classic', classicSnapshot);

const challengeState = global.PuyoChallengeRules.normalize({
  completed: 3,
  mission: { type: 'largeGroup', target: 6, title: '一次连接消除 6 颗同色', progress: 4 },
});
const pendingBuild = global.PuyoRogueliteRules.normalize({
  picks: 1,
  upgrades: { chainShield: 1 },
  pendingChoice: ['chainEcho', 'cleaner', 'steadyHands'],
}, challengeState.completed);
const challengeSnapshot = session.snapshot({
  gameType: 'challenge', board: boardRules.emptyBoard(), pair: { x: 2, y: 0, rot: 0, colors: [2, 3] },
  queue: [[4, 1], [3, 3]], score: 480, level: 2, clearedTotal: 42, runMaxChain: 3,
  hiAtStart: 450, bestChainAtStart: 2, challengeState, runBuild: pendingBuild,
});
challengeSnapshot.savedAt = 200;
storage.save('challenge', challengeSnapshot);

const latest = storage.loadLatest();
assert.equal(latest.gameType, 'challenge');
const restored = session.restore(latest, { highScore: 900, bestChain: 5 });
assert.equal(restored.score, 480);
assert.equal(restored.challengeState.stage, 4);
assert.deepEqual(restored.runBuild.pendingChoice, pendingBuild.pendingChoice);
assert.equal(restored.runBuild.upgrades.chainShield, 1);

// A stale board containing a completed group is repaired without losing the active pair.
const staleBoard = boardRules.emptyBoard();
staleBoard[rows - 1] = [0, 2, 2, 2, 2, 0];
assert.equal(boardRules.findClearGroups(staleBoard).length, 1);
const activePair = { x: 2, y: 2, rot: 0, colors: [4, 5] };
const repair = session.prepareResume({ pair: activePair, queue: [[1, 3]] }, true);
assert.equal(repair.pair, null);
assert.deepEqual(repair.queue, [[4, 5], [1, 3]]);
assert.equal(repair.needsResolution, true);

// Existing eight-upgrade build remains a stable baseline before V2 additions.
const modifiers = global.PuyoRogueliteRules.modifiers({ upgrades: {
  chainShield: 2, chainEcho: 3, colorBurst: 1, largeGroup: 2,
   cleaner: 3, buffer: 1, steadyHands: 2, foresight: 3,
} });
assert.deepEqual(modifiers, {
  chainDefense: 2,
  chainScoreMultiplier: 1.5,
  colorBurstThreshold: 7,
  colorBurstClear: 1,
  largeGroupThreshold: 8,
  largeGroupDefense: 2,
  cleanerClear: 3,
  bufferReduction: 1,
  lockDelayMultiplier: 1.2,
  foresightLevel: 3,
  paletteDefense: 0,
  scrapScorePerGarbage: 0,
  chainChargeMax: 0,
  lastStandDefense: 0,
  lastStandMinHeight: 8,
  nextSwapCount: 0,
  nextSwapLockMultiplier: 1,
  cohesionLevel: 0,
});

// Stage completion feeds a deterministic upgrade offer and keeps it stable across normalization.
const completed = global.PuyoChallengeRules.resolveTurn(
  global.PuyoChallengeRules.normalize({ mission: { type: 'clear', target: 4, title: '一回合消除 4 颗', progress: 0 } }),
  { cleared: 4, maxChain: 1, maxColors: 1, largestGroup: 4, clearedThisTurn: true },
  () => 0,
);
assert.equal(completed.completed, true);
const earnedBuild = global.PuyoRogueliteRules.offer(global.PuyoRogueliteRules.normalize({}, 0), 3, () => 0);
assert.equal(earnedBuild.pendingChoice.length, 3);
assert.deepEqual(global.PuyoRogueliteRules.normalize(earnedBuild, 3).pendingChoice, earnedBuild.pendingChoice);

// Completing Stage 4 enters a special Stage; completing it yields a special offer.
const beforeSpecial = global.PuyoChallengeRules.normalize({
  completed: 3,
  mission: { type: 'clear', target: 4, title: '一回合消除 4 颗', progress: 0 },
});
const enteredSpecial = global.PuyoChallengeRules.resolveTurn(beforeSpecial, { cleared: 4, clearedThisTurn: true }, () => 0);
assert.equal(enteredSpecial.enteredSpecial, true);
assert.equal(enteredSpecial.state.stage, 5);
assert.ok(enteredSpecial.state.special);
const clearedSpecial = global.PuyoChallengeRules.resolveTurn(enteredSpecial.state, {
  maxChain: 9,
  cleared: 99,
  maxColors: 4,
  largestGroup: 12,
  garbageCleared: 12,
  scoreGained: 9999,
  clearedThisTurn: true,
  boardHeight: 0,
  colorClearedCount: 99,
}, () => 0);
assert.equal(clearedSpecial.specialCompleted, true);
assert.equal(clearedSpecial.state.stage, 6);
const settledBuild = global.PuyoRogueliteRules.choose(earnedBuild, earnedBuild.pendingChoice[0], 3).state;
const specialBuild = global.PuyoRogueliteRules.offerRelic(settledBuild, () => 0);
assert.equal(specialBuild.pendingRelicChoice.length, 2);
assert.ok(specialBuild.pendingRelicChoice.every((id) => global.PuyoRogueliteRules.RELIC_BY_ID[id].rarity === 'relic'));

console.log('puyo flow regression tests passed');
