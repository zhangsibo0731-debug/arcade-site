const SELECT_SCORE = 'SELECT score FROM weekly_scores WHERE week_key = ? AND game = ? AND mode = ? AND player_id = ?';

export function createLeaderboardStore(db) {
  return Object.freeze({
    async list(weekKey, game, mode, limit) {
      const result = await db.prepare(`
        SELECT player_name AS playerName, score, stage, max_chain AS maxChain, achieved_at AS achievedAt
        FROM weekly_scores WHERE week_key = ? AND game = ? AND mode = ?
        ORDER BY score DESC, achieved_at ASC LIMIT ?
      `).bind(weekKey, game, mode, limit).all();
      return result.results || [];
    },

    async scoreFor(weekKey, game, mode, playerId) {
      return db.prepare(SELECT_SCORE).bind(weekKey, game, mode, playerId).first();
    },

    async upsert(weekKey, value) {
      return db.prepare(`
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
      `).bind(weekKey, value.submissionId, value.playerId, value.playerName, value.game, value.mode, value.score, value.stage, value.maxChain, value.durationMs, value.gameVersion).run();
    },

    async rankFor(weekKey, game, mode, score) {
      return db.prepare('SELECT 1 + COUNT(*) AS rank FROM weekly_scores WHERE week_key = ? AND game = ? AND mode = ? AND score > ?').bind(weekKey, game, mode, score).first();
    },
  });
}
