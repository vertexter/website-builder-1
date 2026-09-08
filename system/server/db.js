'use strict';

const path = require('path');
const fs = require('fs');
const { DatabaseSync } = require('node:sqlite');
const { RANKS, ACHIEVEMENTS, DIFFICULTY_XP, LEVEL_XP_BASE, LEVEL_XP_INCREMENT } = require('./config/progression');

const DATA_DIR = process.env.SYSTEM_DATA_DIR || path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const DB_PATH = process.env.SYSTEM_DB_PATH || path.join(DATA_DIR, 'system.db');

const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE,
  password_hash TEXT,
  password_salt TEXT,
  player_name TEXT NOT NULL,
  is_guest INTEGER NOT NULL DEFAULT 0,
  is_admin INTEGER NOT NULL DEFAULT 0,
  onboarded INTEGER NOT NULL DEFAULT 0,
  avatar TEXT DEFAULT 'default',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS settings (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  theme TEXT NOT NULL DEFAULT 'system-dark',
  accent_color TEXT NOT NULL DEFAULT 'blue',
  sound_enabled INTEGER NOT NULL DEFAULT 0,
  animation_intensity TEXT NOT NULL DEFAULT 'normal',
  reduced_motion INTEGER NOT NULL DEFAULT 0,
  visible_stats TEXT NOT NULL DEFAULT '["STR","INT","VIT","AGI","DISC","FOC","CHA"]',
  dashboard_layout TEXT NOT NULL DEFAULT '["quests","stats","streak","missions","achievements"]'
);

CREATE TABLE IF NOT EXISTS player (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  level INTEGER NOT NULL DEFAULT 1,
  total_xp INTEGER NOT NULL DEFAULT 0,
  rank TEXT NOT NULL DEFAULT 'E',
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_completion_date TEXT,
  total_quests_completed INTEGER NOT NULL DEFAULT 0,
  perfect_days INTEGER NOT NULL DEFAULT 0,
  last_perfect_date TEXT
);

CREATE TABLE IF NOT EXISTS stats (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stat_key TEXT NOT NULL,
  xp INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, stat_key)
);

CREATE TABLE IF NOT EXISTS quests (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  notes TEXT,
  stat_key TEXT,
  difficulty TEXT NOT NULL DEFAULT 'normal',
  xp_reward INTEGER NOT NULL,
  quest_type TEXT NOT NULL DEFAULT 'daily',
  frequency_type TEXT NOT NULL DEFAULT 'daily',
  frequency_data TEXT NOT NULL DEFAULT '{}',
  target_count INTEGER,
  active INTEGER NOT NULL DEFAULT 1,
  is_boss INTEGER NOT NULL DEFAULT 0,
  start_date TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS quest_completions (
  id TEXT PRIMARY KEY,
  quest_id TEXT NOT NULL REFERENCES quests(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  completed_date TEXT NOT NULL,
  xp_awarded INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(quest_id, completed_date)
);

CREATE TABLE IF NOT EXISTS xp_transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  reason TEXT NOT NULL,
  stat_key TEXT,
  quest_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS user_achievements (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  achievement_key TEXT NOT NULL,
  unlocked_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, achievement_key)
);

CREATE TABLE IF NOT EXISTS missions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  mission_type TEXT NOT NULL DEFAULT 'weekly',
  target INTEGER NOT NULL DEFAULT 1,
  progress INTEGER NOT NULL DEFAULT 0,
  xp_reward INTEGER NOT NULL DEFAULT 100,
  linked_quest_id TEXT,
  start_date TEXT NOT NULL,
  end_date TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS system_config (
  scope TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_quests_user ON quests(user_id);
CREATE INDEX IF NOT EXISTS idx_completions_user_date ON quest_completions(user_id, completed_date);
CREATE INDEX IF NOT EXISTS idx_xp_tx_user ON xp_transactions(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_missions_user ON missions(user_id);
`);

// Seed default system_config rows (admin-tunable) if absent.
function seedConfig() {
  const existing = db.prepare('SELECT scope FROM system_config').all();
  const have = new Set(existing.map((r) => r.scope));
  const defaults = {
    difficulty_xp: DIFFICULTY_XP,
    ranks: RANKS,
    achievements: ACHIEVEMENTS,
    level_xp_base: LEVEL_XP_BASE,
    level_xp_increment: LEVEL_XP_INCREMENT,
  };
  const insert = db.prepare('INSERT INTO system_config (scope, value) VALUES (?, ?)');
  for (const [scope, value] of Object.entries(defaults)) {
    if (!have.has(scope)) insert.run(scope, JSON.stringify(value));
  }
}
seedConfig();

function getConfig(scope) {
  const row = db.prepare('SELECT value FROM system_config WHERE scope = ?').get(scope);
  return row ? JSON.parse(row.value) : null;
}

function setConfig(scope, value) {
  db.prepare(
    'INSERT INTO system_config (scope, value) VALUES (?, ?) ON CONFLICT(scope) DO UPDATE SET value = excluded.value'
  ).run(scope, JSON.stringify(value));
}

module.exports = { db, getConfig, setConfig };
