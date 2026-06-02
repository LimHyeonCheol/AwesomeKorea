ALTER TABLE contents
  ADD COLUMN release_date TEXT;

ALTER TABLE contents
  ADD COLUMN search_keywords_json TEXT NOT NULL DEFAULT '[]';

ALTER TABLE contents
  ADD COLUMN priority_score INTEGER NOT NULL DEFAULT 0;

ALTER TABLE contents
  ADD COLUMN hero_message_ko TEXT;

CREATE TABLE IF NOT EXISTS editorial_slots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slot_code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  scope TEXT NOT NULL,
  max_items INTEGER NOT NULL DEFAULT 1,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS editorial_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slot_id INTEGER NOT NULL,
  target_type TEXT NOT NULL DEFAULT 'content' CHECK (target_type IN ('content')),
  target_ref TEXT NOT NULL,
  headline_override_ko TEXT,
  body_override_ko TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (slot_id) REFERENCES editorial_slots (id)
);

CREATE INDEX IF NOT EXISTS idx_contents_priority_score
  ON contents (priority_score DESC, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_editorial_entries_slot_target
  ON editorial_entries (slot_id, target_ref, is_active, sort_order);
