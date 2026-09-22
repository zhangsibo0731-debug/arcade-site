'use strict';

const http = require('node:http');
const { createD1Client } = require('./d1-client.js');
const { allowedOrigins, corsHeaders, json, originOf } = require('./http.js');
const { readLeaderboard, submitScore } = require('./leaderboard-service.js');
const { createLeaderboardStore } = require('./leaderboard-store.js');

async function handleRequest(request, options = {}) {
  const method = String(request.method || 'GET').toUpperCase();
  const url = new URL(request.url || '/', 'https://gateway.invalid');
  const origin = originOf(request);
  const cors = corsHeaders(origin);
  const d1 = options.d1 || createD1Client(options);

  if (method === 'OPTIONS') {
    if (!origin || !allowedOrigins().has(origin)) return json(403, { error: '不允许的来源' });
    return { statusCode: 204, headers: cors, body: '' };
  }

  try {
    if (method === 'GET' && url.pathname === '/api/v1/health') {
      await d1.query('SELECT 1 AS ok');
      return json(200, { ok: true, service: 'arcade-api-cn', version: 1, storage: 'cloudflare-d1' }, cors);
    }

    const store = options.store || createLeaderboardStore(d1);
    const now = options.now || new Date();
    let result;
    if (method === 'GET' && url.pathname === '/api/v1/leaderboard') {
      result = await readLeaderboard(url, store, now);
    } else if (method === 'POST' && url.pathname === '/api/v1/scores') {
      let body;
      try { body = typeof request.body === 'string' ? JSON.parse(request.body) : request.body; }
      catch { result = { status: 400, data: { error: '请求体必须是 JSON' } }; }
      if (!result) result = await submitScore(body, store, now);
    } else {
      result = { status: 404, data: { error: 'Not Found' } };
    }
    return json(result.status, result.data, { ...cors, ...result.headers });
  } catch (error) {
    console.error('arcade gateway request failed', error && error.message);
    const unavailable = error && error.message === 'gateway_not_configured';
    return json(503, { error: unavailable ? '排行榜网关尚未配置' : '排行榜暂时不可用' }, { ...cors, 'cache-control': 'no-store' });
  }
}

function startServer(port = Number(process.env.PORT) || 9000) {
  const server = http.createServer((request, response) => {
    let body = '';
    request.setEncoding('utf8');
    request.on('data', (chunk) => {
      body += chunk;
      if (body.length > 16384) request.destroy();
    });
    request.on('end', async () => {
      const result = await handleRequest({ method: request.method, url: request.url, headers: request.headers, body });
      response.writeHead(result.statusCode, result.headers);
      response.end(result.body);
    });
  });
  return server.listen(port, '0.0.0.0');
}

module.exports = {
  createD1Client,
  handleRequest,
  startServer,
  ...require('./leaderboard-rules.js'),
};

if (require.main === module) startServer();
