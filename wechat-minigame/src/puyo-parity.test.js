'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
global.window = global;
const modules = ['board-rules', 'scoring-rules', 'rotation-rules', 'challenge-rules', 'roguelite-rules', 'active-item-rules', 'challenge-effects', 'session-state', 'game-session', 'storage', 'input'];
modules.forEach((name) => require('../vendor/puyo/' + name + '.js'));
const PuyoGame = require('./puyo-game.js');
const clone = (value) => JSON.parse(JSON.stringify(value));
function rng(seed) { let value = seed >>> 0; return () => { value = (Math.imul(value, 1664525) + 1013904223) >>> 0; return value / 4294967296; }; }
let clock = 10000;
const reference = vm.createContext({ setTimeout, clearTimeout });
vm.runInContext('globalThis.window = globalThis;', reference);
modules.concat('game-session-web-effects').forEach((name) => vm.runInContext(fs.readFileSync(path.resolve(__dirname, '../../puyo', name + '.js'), 'utf8'), reference, { filename: 'web/' + name + '.js' }));
const rules = reference.PuyoChallengeRules;
const boardRules = reference.PuyoBoardRules.create({ rows: 12, cols: 6, garbage: 6, isGarbage: rules.isGarbage, rotations: [[0, -1], [1, 0], [0, 1], [-1, 0]] });
const validators = reference.PuyoStorage.create({ rows: 12, cols: 6, maxCell: 8, colorCount: 5, rotationCount: 4 });
const web = reference.PuyoGameSession.create({
  boardRules, scoringRules: reference.PuyoScoringRules, rotationRules: reference.PuyoRotationRules,
  rogueliteRules: reference.PuyoRogueliteRules, challengeRules: rules, activeItemRules: reference.PuyoActiveItemRules,
  challengeEffects: reference.PuyoChallengeEffects.create({ challengeRules: rules, rogueliteRules: reference.PuyoRogueliteRules, activeItemRules: reference.PuyoActiveItemRules, boardRules, garbage: 6, rows: 12 }),
  sessionState: reference.PuyoSessionState.create({ storage: validators, challengeRules: rules, rogueliteRules: reference.PuyoRogueliteRules, activeItemRules: reference.PuyoActiveItemRules, emptyBoard: boardRules.emptyBoard }),
  random: rng(816), now: () => clock,
});
const values = new Map();
const ctx = new Proxy({ createLinearGradient: () => ({ addColorStop() {} }), measureText: (text) => ({ width: String(text).length * 7 }) }, { get: (target, key) => key in target ? target[key] : () => {} });
const mini = new PuyoGame({ getContext: () => ctx }, {
  random: rng(816), now: () => clock,
  storage: () => ({ get: (key, fallback) => values.has(key) ? values.get(key) : fallback, set: (key, value) => { values.set(key, clone(value)); return true; }, remove: (key) => values.delete(key) }),
  audio: () => ({ isMuted: () => true, start() {}, play() {}, pause() {}, resume() {}, stop() {}, haptic() {} }),
  systemInfo: () => ({ width: 390, height: 844, pixelRatio: 2, safeArea: { top: 47, bottom: 810 } }),
});
let webTrace = [], miniTrace = [], timerId = 0, timers = [];
const handle = mini.controller.handle.bind(mini.controller);
mini.controller.handle = (event) => { miniTrace.push(clone(event)); handle(event); };
const renderer = new Proxy({}, { get: () => () => {} });
const adapter = reference.PuyoGameSessionWebEffects.create({
  session: web, renderer,
  setTimeout: (callback, delay) => { const item = { id: ++timerId, callback, delay }; timers.push(item); return item.id; },
  clearTimeout: (id) => { timers = timers.filter((item) => item.id !== id); },
  onState: (state, events) => webTrace.push(...clone(events)),
});

function compare(label) {
  const a = clone(web.snapshot()), b = clone(mini.controller.session.snapshot());
  assert.deepStrictEqual(b, a, label + ': full gameplay snapshots differ');
  assert.deepStrictEqual(miniTrace, webTrace, label + ': semantic events differ');
}
function flush() {
  for (let guard = 0; timers.length && guard < 100; guard++) {
    timers.sort((a, b) => a.delay - b.delay);
    timers.shift().callback();
  }
  for (let guard = 0; mini.controller.effect && guard < 100; guard++) {
    mini.controller.effect.remaining = 0;
    mini.update(0);
  }
  assert.strictEqual(timers.length, 0);
  assert.strictEqual(mini.controller.effect, null);
}
function start(type) {
  adapter.cancel(); timers = []; webTrace = []; miniTrace = [];
  web.start(type, mini.controller.records(type)); adapter.pump(); mini.newGame(type);
  compare('new ' + type);
}
function load(saved, label) {
  adapter.cancel(); timers = []; webTrace = []; miniTrace = [];
  web.restore(clone(saved), mini.controller.records(saved.gameType)); adapter.pump();
  mini.controller.restore(clone(saved));
  compare(label + ' restored');
}
const commands = {
  left: { type: 'move', direction: -1 }, right: { type: 'move', direction: 1 },
  ccw: { type: 'rotate', direction: -1 }, cw: { type: 'rotate', direction: 1 },
  down: { type: 'softDrop' }, drop: { type: 'hardDrop' }, bottle: { type: 'toggleBottle' },
  swapNext: { type: 'swapNext' }, pause: { type: 'pause' }, resume: { type: 'resume' },
};
function action(name) {
  clock += 35;
  const state = web.view();
  let command = commands[name];
  if (name.startsWith('choice:')) command = { type: state.runBuild.pendingRelicChoice.length ? 'chooseRelic' : 'chooseUpgrade', id: name.slice(7) };
  if (name === 'contractYes' || name === 'contractNo') command = { type: 'chooseContract', accept: name === 'contractYes' };
  web.dispatch(command); adapter.pump(); mini.perform(name); flush(); compare(name);
}

let sequences = 0;
for (const type of ['classic', 'challenge']) {
  start(type);
  const inputs = rng(32);
  for (let step = 0; step < 100; step++) {
    const view = web.view();
    if (view.mode === 'gameover') break;
    if (view.mode === 'choosing') action('choice:' + (view.runBuild.pendingRelicChoice[0] || view.runBuild.pendingChoice[0]));
    else if (view.mode === 'contract') action('contractNo');
    else action(['left', 'right', 'cw', 'ccw', 'down', 'drop'][Math.floor(inputs() * 6)]);
    sequences++;
  }
}

start('challenge');
const baseline = clone(web.snapshot());
for (const item of global.PuyoRogueliteRules.DEFINITIONS) {
  for (let level = 1; level <= item.maxLevel; level++) {
    const saved = clone(baseline);
    saved.runBuild.upgrades[item.id] = level;
    saved.board[11] = [1, 1, 1, 0, 6, 6];
    saved.pair = { x: 3, y: 9, rot: 0, colors: [1, 2] };
    saved.challengeState.pendingGarbage = 9;
    saved.challengeState.pressureIn = 1;
    saved.runBuild.counters.chainCharge = 2;
    load(saved, item.id + level); action('resume');
    if (item.id === 'nextSwap') action('swapNext');
    action('drop'); sequences++;
  }
}
for (const relic of global.PuyoRogueliteRules.RELICS) {
  const saved = clone(baseline); saved.runBuild.relics = [relic.id];
  saved.board[11] = [1, 1, 1, 1, 0, 0]; saved.board[10] = [2, 2, 2, 2, 0, 0];
  saved.pair = { x: 5, y: 9, rot: 0, colors: [3, 4] };
  load(saved, relic.id); action('resume'); action('drop'); sequences++;
}
for (const accept of [false, true]) {
  const saved = clone(baseline); saved.pair = null;
  saved.challengeState.completed = 3;
  saved.runBuild.contract = { id: 'overload', stage: 4, status: 'pending' };
  load(saved, 'contract'); action('resume'); action(accept ? 'contractYes' : 'contractNo'); sequences++;
}
const bottle = clone(baseline); bottle.pair = { x: 5, y: 9, rot: 0, colors: [3, 4] }; bottle.board[11] = [1, 2, 1, 2, 0, 0];
load(bottle, 'bottle'); action('resume'); action('bottle'); action('drop'); sequences++;
// A real three-link cascade, not merely equipping upgrades on a single-clear fixture.
for (const upgrade of ['', 'chainEcho', 'chainShield', 'chainCharge']) {
  const saved = clone(baseline);
  if (upgrade) saved.runBuild.upgrades[upgrade] = 3;
  saved.board[11] = [2, 2, 1, 2, 3, 0];
  saved.board[10] = [1, 1, 1, 3, 0, 0];
  saved.board[9] = [0, 3, 2, 0, 0, 0];
  saved.board[8] = [0, 0, 3, 0, 0, 0];
  saved.pair = { x: 5, y: 6, rot: 0, colors: [4, 4] };
  saved.challengeState.pendingGarbage = 12;
  saved.challengeState.pressureIn = 5;
  saved.runBuild.counters.chainCharge = 2;
  load(saved, 'three-chain ' + upgrade); action('resume'); action('drop');
  assert.strictEqual(web.snapshot().runMaxChain, 3, 'fixture must actually resolve three links');
  sequences++;
}
console.log('web/WeChat adapters match complete snapshots and event order across ' + sequences + ' command/scenario checks');
