CREATE TABLE IF NOT EXISTS scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  submission_id TEXT NOT NULL UNIQUE,
  player_id TEXT NOT NULL,
  player_name TEXT NOT NULL,
  game TEXT NOT NULL,
  mode TEXT NOT NULL,
  score INTEGER NOT NULL CHECK (score >= 0),
  stage INTEGER NOT NULL DEFAULT 0 CHECK (stage >= 0),
  max_chain INTEGER NOT NULL DEFAULT 0 CHECK (max_chain >= 0),
  duration_ms INTEGER NOT NULL DEFAULT 0 CHECK (duration_ms >= 0),
  game_version TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_scores_leaderboard
ON scores(game, mode, score DESC, created_at ASC);
