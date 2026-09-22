import { allowedOrigin, corsHeaders, json, withHeaders } from './http.js';
import { readLeaderboard, submitScore } from './leaderboard-service.js';
import { createLeaderboardStore } from './leaderboard-store.js';

export async function handleRequest(request, env, options = {}) {
  const url = new URL(request.url);
  const cors = corsHeaders(request, env);
  if (request.method === 'OPTIONS') {
    if (!allowedOrigin(request, env)) return json({ error: '不允许的来源' }, 403);
    return new Response(null, { status: 204, headers: cors });
  }

  if (request.method === 'GET' && url.pathname === '/api/v1/health') {
    return withHeaders(json({ ok: true, service: 'arcade-api', version: 2 }), cors);
  }

  const store = options.store || createLeaderboardStore(env.DB);
  const now = options.now || new Date();
  let result;
  if (request.method === 'GET' && url.pathname === '/api/v1/leaderboard') {
    result = await readLeaderboard(url, store, now);
  } else if (request.method === 'POST' && url.pathname === '/api/v1/scores') {
    let body;
    try { body = await request.json(); }
    catch { result = { status: 400, data: { error: '请求体必须是 JSON' } }; }
    if (!result) result = await submitScore(body, store, now);
  } else {
    result = { status: 404, data: { error: 'Not Found' } };
  }
  return withHeaders(json(result.data, result.status, result.headers), cors);
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

export { validateScore, weekInfo } from './leaderboard-rules.js';
