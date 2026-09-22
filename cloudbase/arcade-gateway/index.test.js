'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { handleRequest, validateScore, weekInfo } = require('./index.js');

const NOW = new Date('2026-09-21T09:00:00.000Z');

test('week boundary follows Beijing Monday', () => {
  assert.equal(weekInfo(NOW).key, '2026-09-21');
  assert.equal(weekInfo(NOW).resetAt, '2026-09-27T16:00:00.000Z');
});

test('score validation matches challenge API constraints', () => {
  const valid = validateScore({ submissionId: 's1', playerId: 'p1', playerName: '月兔', game: 'puyo', mode: 'challenge', score: 123, stage: 2, maxChain: 3, durationMs: 1000, gameVersion: '55' });
  assert.equal(valid.error, undefined);
  assert.match(validateScore({}).error, /缺少/);
});

test('leaderboard keeps the existing response shape', async () => {
  const calls = [];
  const d1 = { query: async (sql, params) => {
    calls.push({ sql, params });
    return { results: [{ playerName: '月兔', score: 698, stage: 2, maxChain: 2, achievedAt: '2026-09-21 08:18:34' }] };
  } };
  const response = await handleRequest({ method: 'GET', url: '/api/v1/leaderboard?game=puyo&mode=challenge', headers: {} }, { d1, now: NOW });
  const body = JSON.parse(response.body);
  assert.equal(response.statusCode, 200);
  assert.equal(body.entries[0].score, 698);
  assert.equal(calls[0].params[0], '2026-09-21');
});

test('score submission preserves a higher previous score', async () => {
  let call = 0;
  const d1 = { query: async () => {
    call += 1;
    if (call === 1) return { results: [{ score: 1000 }] };
    if (call === 3) return { results: [{ score: 1000 }] };
    if (call === 4) return { results: [{ rank: 1 }] };
    return { results: [] };
  } };
  const score = { submissionId: 's1', playerId: 'p1', playerName: '月兔', game: 'puyo', mode: 'challenge', score: 900, stage: 2, maxChain: 3, durationMs: 5000, gameVersion: '55' };
  const response = await handleRequest({ method: 'POST', url: '/api/v1/scores', headers: {}, body: JSON.stringify(score) }, { d1, now: NOW });
  const body = JSON.parse(response.body);
  assert.equal(response.statusCode, 201);
  assert.equal(body.improved, false);
  assert.equal(body.personalBest, 1000);
});

test('CORS preflight rejects unknown origins', async () => {
  const response = await handleRequest({ method: 'OPTIONS', url: '/api/v1/scores', headers: { origin: 'https://evil.example' } }, { d1: {} });
  assert.equal(response.statusCode, 403);
});

test('missing credentials fail without exposing secrets', async () => {
  const response = await handleRequest({ method: 'GET', url: '/api/v1/health', headers: {} }, { apiToken: '' });
  assert.equal(response.statusCode, 503);
  assert.equal(JSON.parse(response.body).error, '排行榜网关尚未配置');
});

test('malformed JSON and D1 failures return safe errors', async () => {
  const malformed = await handleRequest({ method: 'POST', url: '/api/v1/scores', headers: {}, body: '{bad' }, { d1: {} });
  assert.equal(malformed.statusCode, 400);
  assert.match(JSON.parse(malformed.body).error, /JSON/);

  const d1 = { query: async () => { throw new Error('database-secret-detail'); } };
  const failed = await handleRequest({ method: 'GET', url: '/api/v1/leaderboard?game=puyo', headers: {} }, { d1, now: NOW });
  assert.equal(failed.statusCode, 503);
  assert.equal(JSON.parse(failed.body).error, '排行榜暂时不可用');
});
