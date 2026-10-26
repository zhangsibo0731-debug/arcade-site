'use strict';

const assert = require('node:assert/strict');
global.window = global;
require('./board-rules.js');
require('./scoring-rules.js');
require('./rotation-rules.js');
require('./challenge-rules.js');
require('./roguelite-rules.js');
require('./active-item-rules.js');
require('./challenge-effects.js');
require('./session-state.js');
require('./game-session.js');

const rotations = [[0, -1], [1, 0], [0, 1], [-1, 0]];
const boardRules = global.PuyoBoardRules.create({ rows: 12, cols: 6, garbage: global.PuyoChallengeRules.GARBAGE, isGarbage: global.PuyoChallengeRules.isGarbage, rotations });

function sequence(values) {
  let index = 0;
  return () => values[index++ % values.length];
}

function make(random, now) {
  const challengeEffects = global.PuyoChallengeEffects.create({
    challengeRules: global.PuyoChallengeRules,
    rogueliteRules: global.PuyoRogueliteRules,
    activeItemRules: global.PuyoActiveItemRules,
    boardRules,
    garbage: global.PuyoChallengeRules.GARBAGE,
    rows: 12,
  });
  const sessionState = global.PuyoSessionState.create({
    storage: {
      validBoard: (value) => Array.isArray(value) && value.length === 12 && value.every((row) => Array.isArray(row) && row.length === 6),
      validColors: (value) => Array.isArray(value) && value.length === 2 && value.every((color) => Number.isInteger(color) && color >= 1 && color <= 5),
      validPair: (value) => !!value && Number.isInteger(value.x) && Number.isInteger(value.y) && Number.isInteger(value.rot) && Array.isArray(value.colors),
    },
    challengeRules: global.PuyoChallengeRules,
    rogueliteRules: global.PuyoRogueliteRules,
    activeItemRules: global.PuyoActiveItemRules,
    emptyBoard: boardRules.emptyBoard,
  });
  return global.PuyoGameSession.create({
    boardRules,
    scoringRules: global.PuyoScoringRules,
    rotationRules: global.PuyoRotationRules,
    rogueliteRules: global.PuyoRogueliteRules,
    challengeRules: global.PuyoChallengeRules,
    activeItemRules: global.PuyoActiveItemRules,
    challengeEffects,
    sessionState,
    rotations,
    random,
    now,
  });
}

let clock = 1000;
const session = make(sequence([0, .24, .49, .74, .99]), () => clock);
session.dispatch({ type: 'start', gameType: 'classic', records: { highScore: 900, bestChain: 4 } });
let view = session.view();
assert.deepEqual(view.pair.colors, [1, 1]);
assert.deepEqual(view.queue, [[2, 3], [4, 1], [1, 2]]);
assert.equal(view.lockDelayMs, 480);
assert.equal(view.mode, 'playing');
assert.equal(view.activeCells.length, 2);
assert.equal(view.ghostCells.length, 2);
assert.ok(view.ghostCells.every((cell) => cell.y >= view.activeCells.find((active) => active.color === cell.color).y));

assert.equal(session.dispatch({ type: 'move', direction: -1 }), true);
assert.equal(session.dispatch({ type: 'softDrop' }), true);
assert.equal(session.view().score, 1);
clock += 10;
assert.equal(session.dispatch({ type: 'rotate', direction: 1 }), true);
assert.equal(session.drainEvents().some((event) => event.type === 'rotate'), true);

const beforeDrop = session.view().score;
assert.equal(session.dispatch({ type: 'hardDrop' }), true);
view = session.view();
assert.equal(view.mode, 'playing');
assert.ok(view.score > beforeDrop);
assert.equal(view.board.flat().filter(Boolean).length, 2);
assert.equal(session.drainEvents().some((event) => event.type === 'land'), true);

const colorSession = make(() => .999, () => 0);
colorSession.dispatch({ type: 'start', gameType: 'challenge' });
assert.deepEqual(colorSession.view().pair.colors, [4, 4], 'level 1 only generates four colors');

const pauseSession = make(() => 0, () => 0);
pauseSession.dispatch({ type: 'start', gameType: 'classic' });
assert.equal(pauseSession.dispatch({ type: 'pause' }), true);
const pausedY = pauseSession.view().pair.y;
pauseSession.tick(1000);
assert.equal(pauseSession.view().pair.y, pausedY);
assert.equal(pauseSession.dispatch({ type: 'resume' }), true);

const snapshot = pauseSession.snapshot();
assert.equal(snapshot.schemaVersion, 1);
assert.equal(snapshot.gameType, 'classic');
assert.equal(snapshot.queue.length, 3);

const restoredSession = make(() => 0, () => 2000);
restoredSession.dispatch({ type: 'restore', saved: snapshot, records: { highScore: 900, bestChain: 4 } });
assert.equal(restoredSession.view().mode, 'paused', 'a stable active pair resumes behind the pause gate');
assert.deepEqual(restoredSession.view().pair, snapshot.pair);
assert.deepEqual(restoredSession.view().board, snapshot.board);
assert.equal(restoredSession.view().gameType, 'classic');

const recordSave = pauseSession.snapshot();
recordSave.runMaxChain = 6;
restoredSession.restore(recordSave, { highScore: 900, bestChain: 4 });
assert.equal(restoredSession.snapshot().bestChain, 6, 'resume preserves the highest chain already achieved in this run');
assert.equal(restoredSession.view().chainFeedback.previousBest, 6, 'smaller future chains cannot replay the new-record sound after resume');

const clearSession = make(() => 0, () => 0);
clearSession.dispatch({ type: 'start', gameType: 'classic' });
clearSession.drainEvents();
clearSession.dispatch({ type: 'hardDrop' });
assert.equal(clearSession.view().mode, 'playing', 'a non-clearing lock immediately spawns the next pair');
clearSession.dispatch({ type: 'hardDrop' });
let clearView = clearSession.view();
assert.equal(clearView.mode, 'resolving');
assert.equal(clearView.waitingEffect.type, 'pop');
const popId = clearView.waitingEffect.id;
assert.equal(clearSession.ackEffect(popId + 1), false, 'stale effect acknowledgement is ignored');
assert.equal(clearSession.ackEffect(popId), true);
clearView = clearSession.view();
assert.equal(clearView.waitingEffect.type, 'fall');
assert.equal(clearSession.ackEffect(clearView.waitingEffect.id), true);
assert.equal(clearSession.view().mode, 'playing');
assert.equal(clearSession.view().board.flat().filter(Boolean).length, 0);
assert.equal(clearSession.view().score, 2160, '40 clear points plus 20 hard-drop points and 2100 all-clear score');
assert.deepEqual(clearSession.drainEvents().map((event) => event.type), [
  'hardDrop', 'land', 'stateChanged', 'spawn', 'stateChanged',
  'hardDrop', 'land', 'stateChanged', 'chain', 'pop', 'fall',
  'allClear', 'spawn', 'stateChanged',
], 'fixed classic command sequence keeps its semantic event order');
assert.deepEqual({
  mode: clearSession.view().mode,
  score: clearSession.view().score,
  level: clearSession.view().level,
  clearedTotal: clearSession.view().clearedTotal,
  runMaxChain: clearSession.view().runMaxChain,
  allClearCount: clearSession.view().allClearCount,
  board: clearSession.view().board,
}, {
  mode: 'playing',
  score: 2160,
  level: 1,
  clearedTotal: 4,
  runMaxChain: 1,
  allClearCount: 1,
  board: boardRules.emptyBoard(),
}, 'fixed classic command sequence keeps its golden state snapshot');

const challengeSession = make(() => 0, () => 0);
challengeSession.dispatch({ type: 'start', gameType: 'challenge' });
const initialTurns = challengeSession.view().challengeState.turnsLeft;
challengeSession.dispatch({ type: 'hardDrop' });
assert.equal(challengeSession.view().challengeState.turnsLeft, initialTurns - 1, 'a non-clear turn spends exactly one task turn');
challengeSession.dispatch({ type: 'hardDrop' });
for (let guard = 0; guard < 12 && challengeSession.view().waitingEffect; guard++) {
  challengeSession.ackEffect(challengeSession.view().waitingEffect.id);
}
assert.equal(challengeSession.view().challengeState.turnsLeft, initialTurns - 2, 'a clear and its animation acknowledgements still spend one turn');
assert.ok(['playing', 'choosing', 'contract'].includes(challengeSession.view().mode));

console.log('puyo shared game session baseline tests passed');
