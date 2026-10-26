'use strict';

const assert = require('assert');
global.window = global;
require('../vendor/puyo/roguelite-rules.js');
const Effects = require('./puyo-effects.js');
const Controller = require('./puyo-session-controller.js');

(async () => {
  const values = new Map();
  const game = {
    visual: new Effects(), rogue: window.PuyoRogueliteRules,
    audio: { play() {}, stop() {}, haptic() {} },
    storage: { set: (key, value) => values.set(key, value) },
    leaderboard: { submit: () => Promise.reject(new Error('offline')) },
  };
  const controller = Object.assign(Object.create(Controller.prototype), { game, recordCache: { highScore: 1000, bestChain: 6 }, saves: { clear() {} } });
  controller.handle({ type: 'chain', chain: 3, score: 640, remoteLinks: [{ from: [2, 10], to: [5, 8] }] });
  assert.strictEqual(game.visual.remoteLinks.length, 1);
  assert.deepStrictEqual(game.visual.remoteLinks[0].to, [5, 8]);
  controller.handle({ type: 'upgradeTriggered', upgradeId: 'colorBurst' });
  assert.strictEqual(game.visual.triggers[0].name, '彩色爆破');
  controller.handle({ type: 'garbageDefense' });
  assert.ok(game.visual.defense);
  controller.handle({ type: 'message', text: '干扰抵消 · ×2', complete: true });
  controller.handle({ type: 'message', text: '特殊关完成', complete: true });
  assert.strictEqual(game.visual.notice.text, '干扰抵消 · ×2');
  assert.strictEqual(game.visual.noticeQueue[0].text, '特殊关完成');
  controller.handle({ type: 'allClear', score: 2100, defense: 4 });
  controller.handle({ type: 'chainResult', chain: 3, score: 640, cleared: 12, garbage: 2 });
  assert.ok(game.visual.banner.text.includes('3'));
  game.visual.update(1.1);
  assert.strictEqual(game.visual.banner.text, '全消！', 'all-clear cannot be overwritten by the same-frame chain summary');
  game.visual.update(1.5);
  assert.strictEqual(game.visual.banner.text, '3 连锁完成');
  assert.strictEqual(game.visual.remoteLinks.length, 0);
  assert.strictEqual(game.visual.triggers.length, 0);
  controller.handle({ type: 'gameOver', gameType: 'challenge', score: 1500, highScore: 1500, maxChain: 3, bestChain: 6 });
  assert.strictEqual(game.result.newHighScore, true);
  assert.strictEqual(game.result.newBestChain, false, 'a high score is not necessarily a chain record');
  await new Promise((resolve) => setImmediate(resolve));
  assert.ok(game.result.uploadStatus.includes('提交失败'));
  assert.strictEqual(values.get('moonlit_puyo_best_challenge'), 1500, 'offline submission cannot lose local records');
  game.visual.reset();
  assert.strictEqual(game.visual.bannerQueue.length, 0);
  assert.strictEqual(game.visual.noticeQueue.length, 0);
  console.log('wechat layered feedback tests passed');
})().catch((error) => { console.error(error); process.exitCode = 1; });
