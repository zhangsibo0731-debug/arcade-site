'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { handle, probeD1Api, probeUpstream } = require('./index.js');

test('health probe reports a successful upstream response', async () => {
  const result = await handle({ httpMethod: 'GET' }, {
    fetchImpl: async (_url, options) => new Response(JSON.stringify({ ok: true }), { status: options.method === 'GET' ? 200 : 403 }),
    upstreamUrl: 'https://example.test/health',
    d1ApiUrl: 'https://api.example.test/query',
    timeoutMs: 50,
  });
  const body = JSON.parse(result.body);
  assert.equal(result.statusCode, 200);
  assert.equal(body.ok, true);
  assert.equal(body.upstream.reachable, true);
  assert.equal(body.upstream.status, 200);
});

test('D1 API probe treats an authentication rejection as reachable', async () => {
  const result = await probeD1Api(async () => new Response('', { status: 403 }), 'https://api.example.test/query', 50);
  assert.equal(result.reachable, true);
  assert.equal(result.status, 403);
  assert.equal(result.authenticationRequired, true);
});

test('health probe distinguishes upstream network failure', async () => {
  const result = await probeUpstream(async () => {
    throw new TypeError('fetch failed');
  }, 'https://example.test/health', 50);
  assert.equal(result.reachable, false);
  assert.equal(result.error, 'network_error');
});

test('health probe rejects methods other than GET', async () => {
  const result = await handle({ httpMethod: 'POST' });
  assert.equal(result.statusCode, 405);
});
