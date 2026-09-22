'use strict';

const SELECT_SCORE = 'SELECT score FROM weekly_scores WHERE week_key = ? AND game = ? AND mode = ? AND player_id = ?';

function createLeaderboardStore(d1) {
  return Object.freeze({
    async list(weekKey, game, mode, limit) {
      const result = await d1.query(`
        SELECT player_name AS playerName, score, stage, max_chain AS maxChain, achieved_at AS achievedAt
        FROM weekly_scores WHERE week_key = ? AND game = ? AND mode = ?
        ORDER BY score DESC, achieved_at ASC LIMIT ?
      `, [weekKey, game, mode, limit]);
      return result.results || [];
    },

    async scoreFor(weekKey, game, mode, playerId) {
      const result = await d1.query(SELECT_SCORE, [weekKey, game, mode, playerId]);
      return (result.results || [])[0] || null;
    },

    async upsert(weekKey, value) {
      return d1.query(`
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
      `, [weekKey, value.submissionId, value.playerId, value.playerName, value.game, value.mode, value.score, value.stage, value.maxChain, value.durationMs, value.gameVersion]);
    },

    async rankFor(weekKey, game, mode, score) {
      const result = await d1.query('SELECT 1 + COUNT(*) AS rank FROM weekly_scores WHERE week_key = ? AND game = ? AND mode = ? AND score > ?', [weekKey, game, mode, score]);
      return (result.results || [])[0] || null;
    },
  });
}

module.exports = { createLeaderboardStore };
