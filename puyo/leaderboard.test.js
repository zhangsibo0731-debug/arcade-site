'use strict';

const assert = require('assert');
require('./leaderboard.js');

function memoryStorage() {
  const values = new Map();
  return { getItem: (key) => values.get(key) || null, setItem: (key, value) => values.set(key, value) };
}

(async () => {
  const storage = memoryStorage();
  const calls = [];
  const client = global.PuyoLeaderboard.create({
    storage,
    randomUUID: () => 'fixed-id',
    apiBase: 'https://api.test',
    fetch: async (url, init) => {
      calls.push({ url, init });
      return { ok: true, json: async () => url.includes('leaderboard') ? { entries: [] } : { accepted: true, rank: 1, personalBest: 1000 } };
    },
  });

  assert.strictEqual(client.readProfile().optedIn, false);
  assert.strictEqual((await client.submit({ score: 1 })).skipped, true);
  assert.strictEqual(client.enable('  月兔  ').profile.nickname, '月兔');
  assert.strictEqual(client.readProfile().playerId, 'fixed-id');
  await client.submit({ score: 1000, stage: 2, maxChain: 3, durationMs: 30000, gameVersion: '55' });
  const submitted = JSON.parse(calls[0].init.body);
  assert.deepStrictEqual([submitted.game, submitted.mode, submitted.playerName, submitted.score], ['puyo', 'challenge', '月兔', 1000]);
  assert.strictEqual(client.rename('新名字').profile.playerId, 'fixed-id');
  assert.strictEqual(client.disable().optedIn, false);
  assert.strictEqual((await client.submit({ score: 2000 })).skipped, true);
  assert.strictEqual(global.PuyoLeaderboard.cleanNickname('123456789012345'), '123456789012');
  await client.load();
  assert.ok(calls[1].url.includes('/api/v1/leaderboard'));

  const timeoutClient = global.PuyoLeaderboard.create({
    storage: memoryStorage(),
    apiBase: 'https://api.test',
    timeoutMs: 5,
    fetch: (url, init) => new Promise((resolve, reject) => {
      init.signal.addEventListener('abort', () => {
        const error = new Error('aborted');
        error.name = 'AbortError';
        reject(error);
      });
    }),
  });
  await assert.rejects(timeoutClient.load(), /连接超时/);

  const fallbackCalls = [];
  const fallbackClient = global.PuyoLeaderboard.create({
    storage: memoryStorage(),
    apiBases: ['https://cn-api.test', 'https://global-api.test'],
    fetch: async (url) => {
      fallbackCalls.push(url);
      if (url.startsWith('https://cn-api.test')) throw new TypeError('network failed');
      return { ok: true, json: async () => ({ entries: [{ score: 100 }] }) };
    },
  });
  assert.strictEqual((await fallbackClient.load()).entries[0].score, 100);
  assert.strictEqual(fallbackCalls.length, 2);

  let validationCalls = 0;
  const validationClient = global.PuyoLeaderboard.create({
    storage: memoryStorage(),
    apiBases: ['https://cn-api.test', 'https://global-api.test'],
    fetch: async () => {
      validationCalls += 1;
      return { ok: false, status: 400, json: async () => ({ error: '参数错误' }) };
    },
  });
  await assert.rejects(validationClient.load(), /参数错误/);
  assert.strictEqual(validationCalls, 1);

  console.log('puyo leaderboard tests passed');
})().catch((error) => { console.error(error); process.exitCode = 1; });
