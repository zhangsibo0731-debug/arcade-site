'use strict';

const assert = require('assert');
const leaderboardModule = require('./leaderboard.js');
const values = new Map();
const calls = [];
const storage = {
  get: (key, fallback) => values.has(key) ? values.get(key) : fallback,
  set: (key, value) => values.set(key, value),
};
const platform = {
  request: async (path, options) => {
    calls.push({ path, options });
    return path.includes('leaderboard') ? { entries: [] } : { accepted: true };
  },
};

const leaderboard = leaderboardModule.create(platform, storage, 'test-1');
assert.strictEqual(leaderboardModule.cleanNickname('  月夜玩家名字很长很长  '), '月夜玩家名字很长很长');
assert.strictEqual(leaderboard.enable('月夜玩家'), true);
assert.strictEqual(leaderboard.profile().nickname, '月夜玩家');

(async () => {
  await leaderboard.load();
  await leaderboard.submit({ score: 1234, stage: 8, maxChain: 4, durationMs: 5000 });
  assert.strictEqual(calls[0].path, '/api/v1/leaderboard?game=puyo&mode=challenge');
  assert.strictEqual(calls[1].options.data.score, 1234);
  assert.strictEqual(calls[1].options.data.gameVersion, 'test-1');
  console.log('wechat minigame leaderboard tests passed');
})().catch((error) => { console.error(error); process.exit(1); });
