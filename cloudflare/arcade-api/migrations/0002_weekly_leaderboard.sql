DROP INDEX IF EXISTS idx_scores_leaderboard;
DROP TABLE IF EXISTS scores;

CREATE TABLE weekly_scores (
  week_key TEXT NOT NULL,
  submission_id TEXT NOT NULL,
  player_id TEXT NOT NULL,
  player_name TEXT NOT NULL,
  game TEXT NOT NULL,
  mode TEXT NOT NULL,
  score INTEGER NOT NULL CHECK (score >= 0),
  stage INTEGER NOT NULL DEFAULT 0 CHECK (stage >= 0),
  max_chain INTEGER NOT NULL DEFAULT 0 CHECK (max_chain >= 0),
  duration_ms INTEGER NOT NULL DEFAULT 0 CHECK (duration_ms >= 0),
  game_version TEXT NOT NULL DEFAULT '',
  achieved_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (week_key, game, mode, player_id)
);

CREATE INDEX idx_weekly_scores_rank
ON weekly_scores(week_key, game, mode, score DESC, achieved_at ASC);
