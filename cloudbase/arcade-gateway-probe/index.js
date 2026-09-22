'use strict';

const http = require('node:http');

const DEFAULT_UPSTREAM = 'https://arcade-api.zhangsibo0731.workers.dev/api/v1/health';
const DEFAULT_D1_API = 'https://api.cloudflare.com/client/v4/accounts/4b13ae217111bf8fbc82258ad8073a76/d1/database/9fc94a41-8c69-4691-ab72-bc9cf890c308/query';
const DEFAULT_TIMEOUT_MS = 3000;

function response(statusCode, payload) {
  return {
    statusCode,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
    body: JSON.stringify(payload),
  };
}

async function probeUpstream(fetchImpl, upstreamUrl, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = Date.now();

  try {
    const upstream = await fetchImpl(upstreamUrl, {
      method: 'GET',
      headers: { accept: 'application/json' },
      signal: controller.signal,
    });
    const text = await upstream.text();
    let data = null;
    try { data = JSON.parse(text); } catch { data = text.slice(0, 200); }

    return {
      reachable: true,
      ok: upstream.ok,
      status: upstream.status,
      durationMs: Date.now() - startedAt,
      data,
    };
  } catch (error) {
    return {
      reachable: false,
      ok: false,
      status: null,
      durationMs: Date.now() - startedAt,
      error: error && error.name === 'AbortError' ? 'timeout' : 'network_error',
    };
  } finally {
    clearTimeout(timer);
  }
}

async function probeD1Api(fetchImpl, endpoint, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = Date.now();

  try {
    const apiResponse = await fetchImpl(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ sql: 'SELECT 1' }),
      signal: controller.signal,
    });
    return {
      reachable: true,
      status: apiResponse.status,
      durationMs: Date.now() - startedAt,
      authenticationRequired: apiResponse.status === 401 || apiResponse.status === 403,
    };
  } catch (error) {
    return {
      reachable: false,
      status: null,
      durationMs: Date.now() - startedAt,
      error: error && error.name === 'AbortError' ? 'timeout' : 'network_error',
    };
  } finally {
    clearTimeout(timer);
  }
}

async function handle(event = {}, dependencies = {}) {
  const method = String(event.httpMethod || 'GET').toUpperCase();
  if (method !== 'GET') return response(405, { error: 'Method Not Allowed' });

  const fetchImpl = dependencies.fetchImpl || fetch;
  const upstreamUrl = dependencies.upstreamUrl || process.env.UPSTREAM_HEALTH_URL || DEFAULT_UPSTREAM;
  const d1ApiUrl = dependencies.d1ApiUrl || process.env.D1_API_PROBE_URL || DEFAULT_D1_API;
  const timeoutMs = dependencies.timeoutMs || DEFAULT_TIMEOUT_MS;
  const [upstream, d1Api] = await Promise.all([
    probeUpstream(fetchImpl, upstreamUrl, timeoutMs),
    probeD1Api(fetchImpl, d1ApiUrl, timeoutMs),
  ]);

  return response(200, {
    ok: true,
    service: 'arcade-gateway-probe',
    environment: process.env.TCB_ENV || process.env.SCF_NAMESPACE || 'cloudbase',
    checkedAt: new Date().toISOString(),
    upstream,
    d1Api,
  });
}

exports.main = async (event) => handle(event);
exports.handle = handle;
exports.probeUpstream = probeUpstream;
exports.probeD1Api = probeD1Api;

function startServer(port = Number(process.env.PORT) || 9000) {
  const server = http.createServer(async (request, serverResponse) => {
    const result = await handle({ httpMethod: request.method, path: request.url });
    serverResponse.writeHead(result.statusCode, result.headers);
    serverResponse.end(result.body);
  });
  return server.listen(port, '0.0.0.0');
}

exports.startServer = startServer;

if (require.main === module) startServer();
