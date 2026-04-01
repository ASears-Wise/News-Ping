-- Sources: tracked news organizations
CREATE TABLE sources (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  icon_url TEXT,
  color TEXT,
  app_package TEXT NOT NULL UNIQUE,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Notifications: core data table
CREATE TABLE notifications (
  id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL REFERENCES sources(id),
  title TEXT NOT NULL,
  body TEXT,
  big_text TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  image_url TEXT,
  deep_link TEXT,
  android_channel TEXT,
  raw_extras TEXT,
  dedup_hash TEXT NOT NULL UNIQUE,
  received_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_notifications_source_id ON notifications(source_id);
CREATE INDEX idx_notifications_received_at ON notifications(received_at);
CREATE INDEX idx_notifications_category ON notifications(category);
CREATE INDEX idx_notifications_source_received ON notifications(source_id, received_at);

-- FTS5 virtual table for full-text search
CREATE VIRTUAL TABLE notifications_fts USING fts5(
  title,
  body,
  big_text,
  category,
  content='notifications',
  content_rowid='rowid'
);

-- Triggers to keep FTS in sync
CREATE TRIGGER notifications_ai AFTER INSERT ON notifications BEGIN
  INSERT INTO notifications_fts(rowid, title, body, big_text, category)
  VALUES (new.rowid, new.title, new.body, new.big_text, new.category);
END;

CREATE TRIGGER notifications_ad AFTER DELETE ON notifications BEGIN
  INSERT INTO notifications_fts(notifications_fts, rowid, title, body, big_text, category)
  VALUES ('delete', old.rowid, old.title, old.body, old.big_text, old.category);
END;

CREATE TRIGGER notifications_au AFTER UPDATE ON notifications BEGIN
  INSERT INTO notifications_fts(notifications_fts, rowid, title, body, big_text, category)
  VALUES ('delete', old.rowid, old.title, old.body, old.big_text, old.category);
  INSERT INTO notifications_fts(rowid, title, body, big_text, category)
  VALUES (new.rowid, new.title, new.body, new.big_text, new.category);
END;

-- Users
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT,
  stripe_customer_id TEXT UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Refresh tokens for JWT rotation
CREATE TABLE refresh_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  revoked_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);

-- Subscriptions (mirrors Stripe state)
CREATE TABLE subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  team_id TEXT,
  stripe_price_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  current_period_start TEXT,
  current_period_end TEXT,
  cancel_at_period_end INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);

-- Teams (for Team plan)
CREATE TABLE teams (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  owner_id TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Team members
CREATE TABLE team_members (
  team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  joined_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (team_id, user_id)
);

-- API keys (Team plan)
CREATE TABLE api_keys (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  team_id TEXT REFERENCES teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  last_used_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_api_keys_user_id ON api_keys(user_id);

-- Emulator heartbeats
CREATE TABLE emulator_heartbeats (
  emulator_id TEXT NOT NULL,
  source_id TEXT NOT NULL,
  last_heartbeat_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'healthy',
  PRIMARY KEY (emulator_id, source_id)
);

-- Seed initial sources
INSERT INTO sources (id, name, app_package, color) VALUES
  ('nyt', 'The New York Times', 'com.nytimes.android', '#1A1A1A'),
  ('cnn', 'CNN', 'com.cnn.mobile.android.phone', '#CC0000'),
  ('bbc', 'BBC News', 'bbc.mobile.news.ww', '#BB1919'),
  ('wsj', 'The Wall Street Journal', 'wsj.reader_sp', '#0274B6'),
  ('ap', 'Associated Press', 'mnn.Android', '#ED1C24'),
  ('reuters', 'Reuters', 'com.thomsonreuters.reuters', '#FF8000'),
  ('wapo', 'The Washington Post', 'com.washingtonpost.android', '#231F20'),
  ('fox', 'Fox News', 'com.foxnews.android', '#003366'),
  ('guardian', 'The Guardian', 'com.guardian', '#052962'),
  ('npr', 'NPR News', 'org.npr.one', '#1A1A2E');
