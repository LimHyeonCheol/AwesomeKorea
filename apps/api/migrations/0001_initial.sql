PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  name_ko TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1))
);

CREATE TABLE IF NOT EXISTS contents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id INTEGER NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  title_ko TEXT NOT NULL,
  title_en TEXT,
  aliases_json TEXT NOT NULL DEFAULT '[]',
  release_year INTEGER,
  thumbnail_url TEXT,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'hidden')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories (id)
);

CREATE TABLE IF NOT EXISTS channels (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  youtube_channel_id TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  country_code TEXT,
  default_language TEXT,
  is_korean_channel INTEGER NOT NULL DEFAULT 0 CHECK (is_korean_channel IN (0, 1))
);

CREATE TABLE IF NOT EXISTS reaction_videos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  youtube_video_id TEXT NOT NULL UNIQUE,
  content_id INTEGER NOT NULL,
  channel_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  thumbnail_url TEXT,
  published_at TEXT NOT NULL,
  view_count INTEGER NOT NULL DEFAULT 0,
  like_count INTEGER NOT NULL DEFAULT 0,
  comment_count INTEGER NOT NULL DEFAULT 0,
  detected_language TEXT,
  is_overseas_reaction INTEGER NOT NULL DEFAULT 1 CHECK (is_overseas_reaction IN (0, 1)),
  youtube_url TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (content_id) REFERENCES contents (id),
  FOREIGN KEY (channel_id) REFERENCES channels (id)
);

CREATE TABLE IF NOT EXISTS ranking_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  content_id INTEGER NOT NULL,
  category_id INTEGER NOT NULL,
  rank_type TEXT NOT NULL CHECK (rank_type IN ('weekly', 'popular')),
  rank_value INTEGER NOT NULL,
  reaction_count INTEGER NOT NULL DEFAULT 0,
  total_views INTEGER NOT NULL DEFAULT 0,
  snapshot_date TEXT NOT NULL,
  FOREIGN KEY (content_id) REFERENCES contents (id),
  FOREIGN KEY (category_id) REFERENCES categories (id)
);

CREATE INDEX IF NOT EXISTS idx_categories_active_order
  ON categories (is_active, sort_order);

CREATE INDEX IF NOT EXISTS idx_contents_category_status
  ON contents (category_id, status);

CREATE INDEX IF NOT EXISTS idx_reaction_videos_content_published
  ON reaction_videos (content_id, published_at DESC);

CREATE INDEX IF NOT EXISTS idx_reaction_videos_content_views
  ON reaction_videos (content_id, view_count DESC);

CREATE INDEX IF NOT EXISTS idx_reaction_videos_channel
  ON reaction_videos (channel_id);

CREATE INDEX IF NOT EXISTS idx_ranking_snapshots_snapshot_rank
  ON ranking_snapshots (snapshot_date, rank_type, rank_value);

CREATE INDEX IF NOT EXISTS idx_ranking_snapshots_category_snapshot
  ON ranking_snapshots (category_id, snapshot_date, rank_type);
