CREATE TABLE IF NOT EXISTS app_settings (
  setting_key TEXT PRIMARY KEY,
  value_text TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE reaction_videos
  ADD COLUMN admin_title TEXT;

ALTER TABLE reaction_videos
  ADD COLUMN admin_description TEXT;

ALTER TABLE reaction_videos
  ADD COLUMN is_featured_home INTEGER NOT NULL DEFAULT 0 CHECK (is_featured_home IN (0, 1));

ALTER TABLE reaction_videos
  ADD COLUMN featured_home_order INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_reaction_videos_featured_home
  ON reaction_videos (is_featured_home, featured_home_order, published_at DESC);
