'use strict';

const assert = require('assert');
global.window = global;
require('../vendor/puyo/board-rules.js');
require('../vendor/puyo/scoring-rules.js');
require('../vendor/puyo/rotation-rules.js');
require('../vendor/puyo/challenge-rules.js');
require('../vendor/puyo/roguelite-rules.js');
require('../vendor/puyo/active-item-rules.js');
require('../vendor/puyo/challenge-effects.js');
require('../vendor/puyo/game-session.js');
require('../vendor/puyo/session-state.js');
require('../vendor/puyo/storage.js');
require('../vendor/puyo/input.js');

const PuyoGame = require('./puyo-game.js');
const values = new Map();
const context = new Proxy({
  createLinearGradient: () => ({ addColorStop() {} }),
  measureText: (text) => ({ width: String(text).length * 8 }),
}, {
  get(target, key) { return key in target ? target[key] : () => {}; },
  set(target, key, value) { target[key] = value; return true; },
});
const platform = {
  storage: () => ({ get: (key, fallback) => values.has(key) ? values.get(key) : fallback, set: (key, value) => { values.set(key, value); }, remove: (key) => values.delete(key) }),
  audio: () => ({ isMuted: () => false, settings: () => ({ muted: false, music: 100, sfx: 100, vibration: true }), cycle() {}, toggleVibration() {}, retry() {}, toggle() {}, start() {}, pause() {}, resume() {}, stop() {}, play() {}, haptic() {} }),
  systemInfo: () => ({ width: 390, height: 844, pixelRatio: 2, safeArea: { left: 0, top: 47, right: 390, bottom: 810 } }),
};
const canvas = { width: 0, height: 0, getContext: () => context };
const game = new PuyoGame(canvas, platform);
assert.strictEqual(game.mode, 'lobby');
assert.doesNotThrow(() => game.draw());
game.perform('openPuyo');
assert.strictEqual(game.mode, 'menu');
game.newGame('challenge');
assert.strictEqual(game.gameType, 'challenge');
assert.strictEqual(game.mode, 'playing');
assert.ok(game.pair);
game.perform('sound');
assert.strictEqual(game.mode, 'audio');
assert.doesNotThrow(() => game.draw());
assert.deepStrictEqual(game.buttons.map((entry) => entry.action), ['toggleSound', 'musicVolume', 'sfxVolume', 'vibration', 'previewSound', 'closeAudio']);
const soundPair = game.pair;
game.update(.5);
assert.deepStrictEqual(game.pair, soundPair, 'opening sound settings pauses the game');
game.perform('closeAudio');
assert.strictEqual(game.mode, 'playing');
assert.ok(game.layout().cell >= 40, 'the board should use the available portrait height');
game.perform('bottle');
assert.strictEqual(game.itemState.armedItem, global.PuyoActiveItemRules.MIX_BOTTLE);
game.save();
assert.ok(values.get('moonlit_puyo_save_v3_challenge'));
assert.doesNotThrow(() => game.draw());
game.perform('pause');
assert.strictEqual(game.mode, 'paused');
game.perform('resume');
assert.strictEqual(game.mode, 'playing');

const beforeSoftDrop = game.score;
game.perform('down');
assert.strictEqual(game.score, beforeSoftDrop + 1, 'soft drop uses shared scoring');
assert.strictEqual(game.ghostCells.length, 2, 'the shared core supplies the landing preview');
game.perform('pause');
game.draw();
assert.deepStrictEqual(game.buttons.map((entry) => entry.action), ['resume', 'lobby'], 'pause must hide all underlying hit targets');
const pausedState = game.controller.session.snapshot();
game.touchStart({ touches: [{ clientX: 30, clientY: game.safe.top + 20 }] });
game.update(.04);
assert.strictEqual(game.mode, 'paused', 'touching the background cannot exit the pause dialog');
assert.deepStrictEqual(game.controller.session.snapshot().pair, pausedState.pair);
game.perform('resume');
game.draw();
const right = game.buttons.find((entry) => entry.action === 'right').box;
const initialX = game.pair.x;
game.touchStart({ touches: [{ clientX: right.x + 5, clientY: right.y + 5 }] });
assert.strictEqual(game.pair.x, initialX + 1);
game.update(.16);
assert.strictEqual(game.pair.x, initialX + 1);
game.update(.02);
assert.strictEqual(game.pair.x, initialX + 2, 'long press uses the web 170ms start delay');
game.touchEnd({});
game.perform('build');
assert.strictEqual(game.mode, 'build');
assert.doesNotThrow(() => game.draw());
assert.deepStrictEqual(game.buttons.map((entry) => entry.action), ['closeBuild']);
game.perform('closeBuild');
assert.strictEqual(game.mode, 'playing');

game.save();
const savedChallenge = values.get('moonlit_puyo_save_v3_challenge');
game.newGame('classic');
assert.ok(values.get('moonlit_puyo_save_v3_challenge'), 'starting classic preserves the challenge save');
game.controller.restore(savedChallenge);
assert.strictEqual(game.gameType, 'challenge');
assert.strictEqual(game.mode, 'paused');
assert.deepStrictEqual(game.board, savedChallenge.board);
assert.deepStrictEqual(game.pair, savedChallenge.pair);

const abilitySave = game.controller.session.snapshot();
abilitySave.runBuild.upgrades.nextSwap = 1;
abilitySave.runBuild.upgrades.foresight = 3;
abilitySave.runBuild.relics = ['echoBottle'];
abilitySave.queue = [[1, 2], [3, 4], [2, 2]];
game.controller.restore(abilitySave);
game.perform('resume');
game.draw();
assert.ok(game.buttons.some((entry) => entry.action === 'swapNext'));
game.perform('swapNext');
assert.deepStrictEqual(game.queue.slice(0, 2), [[3, 4], [1, 2]], 'NEXT swap changes the shared queue');
assert.strictEqual(game.rogue.swapStatus(game.build, game.challenge.stage).remaining, 0);
game.perform('build');
assert.doesNotThrow(() => game.draw());
game.perform('closeBuild');

const selection = game.controller.session.snapshot();
selection.pair = null;
selection.runBuild.pendingChoice = ['chainEcho', 'palette', 'buffer'];
game.controller.restore(selection);
game.perform('resume');
assert.strictEqual(game.mode, 'choice');
game.draw();
assert.ok(game.buttons.every((entry) => entry.action.startsWith('choice:')), 'rewards must not expose board buttons');
const screen = { w: game.w, h: game.h, safe: game.safe };
for (const [w, h, top, bottom] of [[375, 667, 20, 647], [390, 844, 47, 810], [430, 932, 47, 898]]) {
  Object.assign(game, { w, h, safe: { top, bottom } });
  game.draw();
  assert.ok(game.buttons.every((entry) => entry.box.y >= top && entry.box.y + entry.box.h <= bottom), 'all reward cards fit inside the safe area');
}
Object.assign(game, screen);
game.perform('choice:palette');
assert.strictEqual(game.build.upgrades.palette, 1);
assert.strictEqual(game.mode, 'playing');

const legacy = { version: 2, gameType: 'challenge', board: game.board, pair: game.pair, queue: game.queue, score: 1234, level: 3, cleared: 77, maxChain: 4, activeMs: 4000, challenge: game.challenge, build: game.build, itemState: game.itemState };
assert.ok(game.controller.restore(legacy));
assert.strictEqual(game.score, 1234);
assert.strictEqual(game.cleared, 77);
assert.strictEqual(game.maxChain, 4);
assert.strictEqual(game.build.upgrades.palette, 1);
assert.strictEqual(game.build.relics[0], 'echoBottle');
game.perform('resume');
game.perform('mission');
assert.strictEqual(game.mode, 'mission');
game.draw();
assert.deepStrictEqual(game.buttons.map((entry) => entry.action), ['closeMission']);
const taskPair = game.pair;
game.update(.5);
assert.deepStrictEqual(game.pair, taskPair, 'reading task details pauses the active pair');
game.perform('closeMission');
assert.strictEqual(game.mode, 'playing');

game.mode = 'gameover';
game.result = { newHighScore: true, newBestChain: false, uploadStatus: '提交失败 · 本地纪录已保存' };
assert.doesNotThrow(() => game.draw());
assert.deepStrictEqual(game.buttons.map((entry) => entry.action), ['restart', 'lobby']);

for (const [width, height, top, bottom] of [[320,568,47,534],[375,667,20,647],[390,844,47,810],[430,932,47,898]]) {
  game.w = width; game.h = height; game.safe = { top, bottom };
  game.gameType = 'challenge'; game.mode = 'playing'; game.draw();
  const mission = game.buttons.find((item) => item.action === 'mission').box;
  const utility = game.buttons.find((item) => item.action === 'bottle').box;
  assert.ok(mission.y + mission.h < utility.y, 'task card must end above utility controls');
  game.mode = 'mission'; game.draw();
  const missionBack = game.buttons.find((item) => item.action === 'closeMission').box;
  const dialogHeight = Math.min(480, bottom - top - 48);
  const dialogTop = missionBack.y - dialogHeight + 53;
  assert.ok(Math.abs((dialogTop - top) - (bottom - dialogTop - dialogHeight)) < 1, 'mission dialog must be centered within the safe area');
  const texts = [];
  context.fillText = (text, x, y) => texts.push({ text, x, y });
  game.mode = 'gameover'; game.result = { newHighScore: true, newBestChain: true }; game.draw();
  const record = texts.find((item) => item.text.startsWith('新纪录'));
  const statisticValues = texts.filter((item) => /^(0|1)( 颗| 次)?$/.test(item.text) && item.y < record.y);
  assert.ok(statisticValues.every((item) => item.y <= record.y - 20), 'record notice must not overlap statistics');
  texts.length = 0;
  game.mode = 'leaderboard'; game.leaderboardEntries = Array.from({length:10}, () => ({playerName:'很长的昵称测试名字',score:123456789})); game.draw();
  const footer = game.buttons.find((item) => item.action === 'nickname').box;
  const scores = texts.filter((item) => item.text === '123456789');
  assert.strictEqual(scores.length, 10);
  assert.ok(scores.every((item) => item.y + 8 < footer.y), 'all leaderboard rows must be above the footer');
  assert.ok(game.buttons.every((item) => item.box.y + item.box.h <= bottom), 'footer buttons must stay in the safe area');
  game.mode = 'build'; game.build = game.rogue.normalize({}, 0); game.draw();
  const buildBack = game.buttons.find((item) => item.action === 'closeBuild').box;
  assert.ok(buildBack.y + buildBack.h <= bottom - 20, 'build return button needs bottom breathing room');
  assert.strictEqual(game.buildMaxScroll, 0, 'empty build must not scroll');
  assert.ok(buildBack.y < top + (bottom - top) * .8, 'empty build must not stretch to screen bottom');
  game.mode = 'choice'; game.choiceKind = 'upgrade';
  game.build.pendingChoice = game.rogue.DEFINITIONS.slice(0, 3).map((item) => item.id);
  game.draw();
  const choices = game.buttons.filter((item) => item.action.startsWith('choice:')).map((item) => item.box);
  assert.strictEqual(choices.length, 3);
  const panelTop = choices[0].y - 102;
  const panelBottom = choices[2].y + choices[2].h + 16;
  assert.ok(Math.abs((panelTop - top) - (bottom - panelBottom)) < 1, 'choice panel must center in safe area');
  assert.ok(panelTop >= top + 19 && panelBottom <= bottom - 19, 'choice panel needs safe margins');
  assert.ok(choices.every((box) => box.h >= 100 && box.h <= 128), 'cards must remain readable without excess blank space');
}
console.log('wechat minigame puyo tests passed');
