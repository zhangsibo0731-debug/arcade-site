import { leaderboardQuery, validateGameMode, validateScore, weekInfo } from './leaderboard-rules.js';

export async function readLeaderboard(url, store, now) {
  const query = leaderboardQuery(url);
  if (!validateGameMode(query.game, query.mode)) return { status: 400, data: { error: '不支持的游戏或模式' } };
  const week = weekInfo(now);
  const entries = await store.list(week.key, query.game, query.mode, query.limit);
  return {
    status: 200,
    data: { game: query.game, mode: query.mode, weekKey: week.key, resetAt: week.resetAt, entries },
    headers: { 'cache-control': 'public, max-age=30' },
  };
}

export async function submitScore(body, store, now) {
  const validation = validateScore(body);
  if (validation.error) return { status: 400, data: { error: validation.error } };
  const value = validation.value;
  const week = weekInfo(now);
  const key = [week.key, value.game, value.mode, value.playerId];
  const previous = await store.scoreFor(...key);
  await store.upsert(week.key, value);
  const best = await store.scoreFor(...key);
  const rank = await store.rankFor(week.key, value.game, value.mode, best.score);
  return {
    status: 201,
    data: { accepted: true, improved: !previous || value.score > previous.score, personalBest: best.score, rank: rank.rank, weekKey: week.key, resetAt: week.resetAt },
    headers: { 'cache-control': 'no-store' },
  };
}
