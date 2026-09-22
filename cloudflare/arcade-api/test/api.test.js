import test from 'node:test';
import assert from 'node:assert/strict';
import { handleRequest, validateScore, weekInfo } from '../src/index.js';

function environment(routes = []) {
  const calls = [];
  let index = 0;
  return {
    calls,
    env: {
      ALLOWED_ORIGINS: 'https://zhangsibo0731-debug.github.io,http://127.0.0.1:8417',
      DB: {
        prepare(sql) {
          const route = routes[index++] || {};
          return {
            bind(...values) {
              calls.push({ sql, values });
              return {
                all: async () => ({ results: route.results || [] }),
                first: async () => route.first || null,
                run: async () => ({ success: true }),
              };
            },
          };
        },
      },
    },
  };
}

const score = {
  submissionId: 'one', playerId: 'player', playerName: '月兔',
  game: 'puyo', mode: 'challenge', score: 1000,
  stage: 2, maxChain: 3, durationMs: 30000, gameVersion: '54',
};

test('Shanghai week starts Monday at 00:00', () => {
  assert.equal(weekInfo(new Date('2026-09-20T15:59:59Z')).key, '2026-09-14');
  const next = weekInfo(new Date('2026-09-20T16:00:00Z'));
  assert.equal(next.key, '2026-09-21');
  assert.equal(next.resetAt, '2026-09-27T16:00:00.000Z');
});

test('health endpoint works without D1', async () => {
  const response = await handleRequest(new Request('https://api.test/api/v1/health'), {});
  assert.equal(response.status, 200);
  assert.equal((await response.json()).version, 2);
});

test('leaderboard binds the server week and returns reset time', async () => {
  const fixture = [{ playerName: '月兔', score: 1234, stage: 3, maxChain: 4 }];
  const { env, calls } = environment([{ results: fixture }]);
  const response = await handleRequest(new Request('https://api.test/api/v1/leaderboard?game=puyo&mode=challenge'), env, { now: new Date('2026-09-21T00:00:00Z') });
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.weekKey, '2026-09-21');
  assert.deepEqual(body.entries, fixture);
  assert.deepEqual(calls[0].values, ['2026-09-21', 'puyo', 'challenge', 20]);
});

test('invalid score fields and unsupported classic mode are rejected', () => {
  assert.equal(validateScore(score).error, undefined);
  assert.match(validateScore({ ...score, score: -1 }).error, /分数/);
  assert.match(validateScore({ ...score, stage: 0 }).error, /Stage/);
  assert.match(validateScore({ ...score, mode: 'classic' }).error, /模式/);
  assert.match(validateScore({ ...score, playerName: '1234567890123' }).error, /昵称|缺少/);
});

test('submission upserts a weekly best and returns rank', async () => {
  const { env, calls } = environment([
    { first: { score: 800 } },
    {},
    { first: { score: 1000 } },
    { first: { rank: 3 } },
  ]);
  const response = await handleRequest(new Request('https://api.test/api/v1/scores', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(score),
  }), env, { now: new Date('2026-09-21T00:00:00Z') });
  const body = await response.json();
  assert.equal(response.status, 201);
  assert.equal(body.improved, true);
  assert.equal(body.personalBest, 1000);
  assert.equal(body.rank, 3);
  assert.ok(calls[1].sql.includes('ON CONFLICT'));
});

test('CORS allows the arcade origin and rejects unknown preflight origins', async () => {
  const { env } = environment();
  const allowed = await handleRequest(new Request('https://api.test/api/v1/health', { headers: { origin: 'https://zhangsibo0731-debug.github.io' } }), env);
  assert.equal(allowed.headers.get('access-control-allow-origin'), 'https://zhangsibo0731-debug.github.io');
  const denied = await handleRequest(new Request('https://api.test/api/v1/scores', { method: 'OPTIONS', headers: { origin: 'https://evil.example' } }), env);
  assert.equal(denied.status, 403);
});
