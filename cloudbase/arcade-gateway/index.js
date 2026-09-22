'use strict';

const http = require('node:http');

const GAMES = new Set(['puyo']);
const MODES = new Set(['challenge']);
const MAX_SCORE = 100000000;
const SHANGHAI_OFFSET_MS = 8 * 60 * 60 * 1000;
const DEFAULT_CLOUDFLARE_ACCOUNT_ID = '4b13ae217111bf8fbc82258ad8073a76';
const DEFAULT_D1_DATABASE_ID = '9fc94a41-8c69-4691-ab72-bc9cf890c308';
const DEFAULT_ALLOWED_ORIGINS = [
  'https://zhangsibo0731-debug.github.io',
  'http://127.0.0.1:8417',
  'http://localhost:8417',
];

function weekInfo(input = new Date()) {
  const now = input instanceof Date ? input : new Date(input);
  const local = new Date(now.getTime() + SHANGHAI_OFFSET_MS);
  const weekdayFromMonday = (local.getUTCDay() + 6) % 7;
  const mondayLocal = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() - weekdayFromMonday);
  const monday = new Date(mondayLocal);
  const key = [monday.getUTCFullYear(), String(monday.getUTCMonth() + 1).padStart(2, '0'), String(monday.getUTCDate()).padStart(2, '0')].join('-');
  return Object.freeze({ key, resetAt: new Date(mondayLocal - SHANGHAI_OFFSET_MS + 7 * 86400000).toISOString() });
}

function cleanText(value, maxLength) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function integer(value, min, max) {
  return Number.isInteger(value) && value >= min && value <= max;
}

function validateScore(body) {
  const value = body && typeof body === 'object' ? body : {};
  const submissionId = cleanText(value.submissionId, 80);
  const playerId = cleanText(value.playerId, 80);
  const playerName = typeof value.playerName === 'string' ? value.playerName.trim() : '';
  const game = cleanText(value.game, 20);
  const mode = cleanText(value.mode, 20);
  const gameVersion = cleanText(value.gameVersion, 30);
  if (!submissionId || !playerId || !playerName) return { error: '缺少成绩标识、玩家标识或昵称' };
  if (Array.from(playerName).length > 12 || /[\u0000-\u001f\u007f]/.test(playerName)) return { error: '昵称不合法' };
  if (!GAMES.has(game) || !MODES.has(mode)) return { error: '不支持的游戏或模式' };
  if (!integer(value.score, 0, MAX_SCORE)) return { error: '分数不合法' };
  if (!integer(value.stage, 1, 9999)) return { error: 'Stage 不合法' };
  if (!integer(value.maxChain, 0, 99)) return { error: '连锁数不合法' };
  if (!integer(value.durationMs, 1000, 86400000)) return { error: '游戏时长不合法' };
  return { value: { submissionId, playerId, playerName, game, mode, score: value.score, stage: value.stage, maxChain: value.maxChain, durationMs: value.durationMs, gameVersion } };
}

function createD1Client(options = {}) {
  const fetchImpl = options.fetchImpl || fetch;
  const accountId = options.accountId || process.env.CLOUDFLARE_ACCOUNT_ID || DEFAULT_CLOUDFLARE_ACCOUNT_ID;
  const databaseId = options.databaseId || process.env.CLOUDFLARE_D1_DATABASE_ID || DEFAULT_D1_DATABASE_ID;
  const apiToken = options.apiToken || process.env.CLOUDFLARE_D1_API_TOKEN;
  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`;

  async function query(sql, params = []) {
    if (!accountId || !databaseId || !apiToken) throw new Error('gateway_not_configured');
    const apiResponse = await fetchImpl(endpoint, {
      method: 'POST',
      headers: { authorization: `Bearer ${apiToken}`, 'content-type': 'application/json' },
      body: JSON.stringify({ sql, params }),
    });
    const payload = await apiResponse.json().catch(() => null);
    const result = payload && Array.isArray(payload.result) ? payload.result[0] : null;
    if (!apiResponse.ok || !payload || payload.success !== true || !result || result.success === false) {
      const error = new Error('d1_query_failed');
      error.status = apiResponse.status;
      throw error;
    }
    return result;
  }

  return Object.freeze({ query });
}

function allowedOrigins() {
  const configured = cleanText(process.env.ALLOWED_ORIGINS, 1000);
  return new Set(configured ? configured.split(',').map((item) => item.trim()).filter(Boolean) : DEFAULT_ALLOWED_ORIGINS);
}

function corsHeaders(origin) {
  if (!origin || !allowedOrigins().has(origin)) return {};
  return {
    'access-control-allow-origin': origin,
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'access-control-allow-headers': 'content-type',
    'access-control-max-age': '86400',
    vary: 'Origin',
  };
}

function json(statusCode, data, headers = {}) {
  return {
    statusCode,
    headers: { 'content-type': 'application/json; charset=utf-8', ...headers },
    body: JSON.stringify(data),
  };
}

async function handleRequest(request, options = {}) {
  const method = String(request.method || 'GET').toUpperCase();
  const url = new URL(request.url || '/', 'https://gateway.invalid');
  const origin = request.headers && (request.headers.origin || request.headers.Origin) || '';
  const cors = corsHeaders(origin);
  const d1 = options.d1 || createD1Client(options);
  const now = options.now || new Date();

  if (method === 'OPTIONS') {
    if (!origin || !allowedOrigins().has(origin)) return json(403, { error: '不允许的来源' });
    return { statusCode: 204, headers: cors, body: '' };
  }

  try {
    if (method === 'GET' && url.pathname === '/api/v1/health') {
      await d1.query('SELECT 1 AS ok');
      return json(200, { ok: true, service: 'arcade-api-cn', version: 1, storage: 'cloudflare-d1' }, cors);
    }

    if (method === 'GET' && url.pathname === '/api/v1/leaderboard') {
      const game = cleanText(url.searchParams.get('game'), 20);
      const mode = cleanText(url.searchParams.get('mode') || 'challenge', 20);
      const requestedLimit = Number(url.searchParams.get('limit') || 20);
      const limit = Number.isInteger(requestedLimit) ? Math.max(1, Math.min(50, requestedLimit)) : 20;
      if (!GAMES.has(game) || !MODES.has(mode)) return json(400, { error: '不支持的游戏或模式' }, cors);
      const week = weekInfo(now);
      const result = await d1.query(`
        SELECT player_name AS playerName, score, stage, max_chain AS maxChain, achieved_at AS achievedAt
        FROM weekly_scores WHERE week_key = ? AND game = ? AND mode = ?
        ORDER BY score DESC, achieved_at ASC LIMIT ?
      `, [week.key, game, mode, limit]);
      return json(200, { game, mode, weekKey: week.key, resetAt: week.resetAt, entries: result.results || [] }, { ...cors, 'cache-control': 'public, max-age=30' });
    }

    if (method === 'POST' && url.pathname === '/api/v1/scores') {
      let body;
      try { body = typeof request.body === 'string' ? JSON.parse(request.body) : request.body; }
      catch { return json(400, { error: '请求体必须是 JSON' }, cors); }
      const validation = validateScore(body);
      if (validation.error) return json(400, { error: validation.error }, cors);
      const value = validation.value;
      const week = weekInfo(now);
      const keyValues = [week.key, value.game, value.mode, value.playerId];
      const previousResult = await d1.query('SELECT score FROM weekly_scores WHERE week_key = ? AND game = ? AND mode = ? AND player_id = ?', keyValues);
      const previous = (previousResult.results || [])[0];
      await d1.query(`
        INSERT INTO weekly_scores (
          week_key, submission_id, player_id, player_name, game, mode, score,
          stage, max_chain, duration_ms, game_version
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(week_key, game, mode, player_id) DO UPDATE SET
          player_name = excluded.player_name,
          updated_at = CURRENT_TIMESTAMP,
          submission_id = CASE WHEN excluded.score > weekly_scores.score THEN excluded.submission_id ELSE weekly_scores.submission_id END,
          score = MAX(weekly_scores.score, excluded.score),
          stage = CASE WHEN excluded.score > weekly_scores.score THEN excluded.stage ELSE weekly_scores.stage END,
          max_chain = CASE WHEN excluded.score > weekly_scores.score THEN excluded.max_chain ELSE weekly_scores.max_chain END,
          duration_ms = CASE WHEN excluded.score > weekly_scores.score THEN excluded.duration_ms ELSE weekly_scores.duration_ms END,
          game_version = CASE WHEN excluded.score > weekly_scores.score THEN excluded.game_version ELSE weekly_scores.game_version END,
          achieved_at = CASE WHEN excluded.score > weekly_scores.score THEN CURRENT_TIMESTAMP ELSE weekly_scores.achieved_at END
      `, [week.key, value.submissionId, value.playerId, value.playerName, value.game, value.mode, value.score, value.stage, value.maxChain, value.durationMs, value.gameVersion]);
      const bestResult = await d1.query('SELECT score FROM weekly_scores WHERE week_key = ? AND game = ? AND mode = ? AND player_id = ?', keyValues);
      const best = (bestResult.results || [])[0];
      const rankResult = await d1.query('SELECT 1 + COUNT(*) AS rank FROM weekly_scores WHERE week_key = ? AND game = ? AND mode = ? AND score > ?', [week.key, value.game, value.mode, best.score]);
      const rank = (rankResult.results || [])[0];
      return json(201, { accepted: true, improved: !previous || value.score > previous.score, personalBest: best.score, rank: rank.rank, weekKey: week.key, resetAt: week.resetAt }, { ...cors, 'cache-control': 'no-store' });
    }

    return json(404, { error: 'Not Found' }, cors);
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

module.exports = { cleanText, createD1Client, handleRequest, startServer, validateScore, weekInfo };

if (require.main === module) startServer();
