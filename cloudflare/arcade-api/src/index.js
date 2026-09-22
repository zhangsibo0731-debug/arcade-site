const GAMES = new Set(['puyo']);
const MODES = new Set(['challenge']);
const MAX_SCORE = 100000000;
const SHANGHAI_OFFSET_MS = 8 * 60 * 60 * 1000;

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', ...headers } });
}

function weekInfo(input = new Date()) {
  const now = input instanceof Date ? input : new Date(input);
  const local = new Date(now.getTime() + SHANGHAI_OFFSET_MS);
  const weekdayFromMonday = (local.getUTCDay() + 6) % 7;
  const mondayLocal = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() - weekdayFromMonday);
  const monday = new Date(mondayLocal);
  const key = [monday.getUTCFullYear(), String(monday.getUTCMonth() + 1).padStart(2, '0'), String(monday.getUTCDate()).padStart(2, '0')].join('-');
  return Object.freeze({ key, resetAt: new Date(mondayLocal - SHANGHAI_OFFSET_MS + 7 * 86400000).toISOString() });
}

function allowedOrigin(request, env) {
  const origin = request.headers.get('origin');
  if (!origin) return '';
  const configured = String(env.ALLOWED_ORIGINS || '').split(',').map((item) => item.trim()).filter(Boolean);
  return configured.includes(origin) ? origin : '';
}

function corsHeaders(request, env) {
  const origin = allowedOrigin(request, env);
  return origin ? {
    'access-control-allow-origin': origin,
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'access-control-allow-headers': 'content-type',
    'access-control-max-age': '86400',
    vary: 'Origin',
  } : {};
}

function integer(value, min, max) {
  return Number.isInteger(value) && value >= min && value <= max;
}

function cleanText(value, maxLength) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function validateScore(body) {
  const value = body && typeof body === 'object' ? body : {};
  const submissionId = cleanText(value.submissionId, 80);
  const playerId = cleanText(value.playerId, 80);
  const rawPlayerName = typeof value.playerName === 'string' ? value.playerName.trim() : '';
  const playerName = rawPlayerName;
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

async function leaderboard(url, env, now) {
  const game = cleanText(url.searchParams.get('game'), 20);
  const mode = cleanText(url.searchParams.get('mode') || 'challenge', 20);
  const requestedLimit = Number(url.searchParams.get('limit') || 20);
  const limit = Number.isInteger(requestedLimit) ? Math.max(1, Math.min(50, requestedLimit)) : 20;
  if (!GAMES.has(game) || !MODES.has(mode)) return json({ error: '不支持的游戏或模式' }, 400);
  const week = weekInfo(now);
  const result = await env.DB.prepare(`
    SELECT player_name AS playerName, score, stage, max_chain AS maxChain, achieved_at AS achievedAt
    FROM weekly_scores WHERE week_key = ? AND game = ? AND mode = ?
    ORDER BY score DESC, achieved_at ASC LIMIT ?
  `).bind(week.key, game, mode, limit).all();
  return json({ game, mode, weekKey: week.key, resetAt: week.resetAt, entries: result.results || [] }, 200, { 'cache-control': 'public, max-age=30' });
}

async function submitScore(request, env, now) {
  let body;
  try { body = await request.json(); } catch { return json({ error: '请求体必须是 JSON' }, 400); }
  const validation = validateScore(body);
  if (validation.error) return json({ error: validation.error }, 400);
  const value = validation.value;
  const week = weekInfo(now);
  const keyValues = [week.key, value.game, value.mode, value.playerId];
  const previous = await env.DB.prepare('SELECT score FROM weekly_scores WHERE week_key = ? AND game = ? AND mode = ? AND player_id = ?').bind(...keyValues).first();
  await env.DB.prepare(`
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
  `).bind(week.key, value.submissionId, value.playerId, value.playerName, value.game, value.mode, value.score, value.stage, value.maxChain, value.durationMs, value.gameVersion).run();
  const best = await env.DB.prepare('SELECT score FROM weekly_scores WHERE week_key = ? AND game = ? AND mode = ? AND player_id = ?').bind(...keyValues).first();
  const rank = await env.DB.prepare('SELECT 1 + COUNT(*) AS rank FROM weekly_scores WHERE week_key = ? AND game = ? AND mode = ? AND score > ?').bind(week.key, value.game, value.mode, best.score).first();
  return json({ accepted: true, improved: !previous || value.score > previous.score, personalBest: best.score, rank: rank.rank, weekKey: week.key, resetAt: week.resetAt }, 201, { 'cache-control': 'no-store' });
}

export async function handleRequest(request, env, options = {}) {
  const url = new URL(request.url);
  const now = options.now || new Date();
  const cors = corsHeaders(request, env);
  if (request.method === 'OPTIONS') {
    if (!allowedOrigin(request, env)) return json({ error: '不允许的来源' }, 403);
    return new Response(null, { status: 204, headers: cors });
  }
  let response;
  if (request.method === 'GET' && url.pathname === '/api/v1/health') response = json({ ok: true, service: 'arcade-api', version: 2 });
  else if (request.method === 'GET' && url.pathname === '/api/v1/leaderboard') response = await leaderboard(url, env, now);
  else if (request.method === 'POST' && url.pathname === '/api/v1/scores') response = await submitScore(request, env, now);
  else response = json({ error: 'Not Found' }, 404);
  const headers = new Headers(response.headers);
  Object.entries(cors).forEach(([key, value]) => headers.set(key, value));
  return new Response(response.body, { status: response.status, headers });
}

export default {
  async fetch(request, env) {
    try { return await handleRequest(request, env); }
    catch (error) {
      console.error('arcade-api request failed', error);
      return json({ error: 'Internal Server Error' }, 500, corsHeaders(request, env));
    }
  },
};

export { validateScore, weekInfo };
