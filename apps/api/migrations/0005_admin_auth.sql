CREATE TABLE IF NOT EXISTS admin_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  login_id TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL DEFAULT '관리자',
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_admin_users_login_active
  ON admin_users (login_id, is_active);

INSERT INTO admin_users (
  login_id,
  password_hash,
  display_name,
  is_active
)
VALUES (
  'admin',
  'scrypt$9f7b4c2d8a1133557799aabbccddeeff$1afa040b9148cb81baac05326329750c0ba59f90a62cc40b680f13431668b509ef246fa7524703b07760abf8c1b77a642b9b636fa19d7ec042308627d32ff635',
  '관리자',
  1
)
ON CONFLICT(login_id) DO NOTHING;
