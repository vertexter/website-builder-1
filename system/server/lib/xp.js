'use strict';

const { randomUUID } = require('crypto');
const { db, getConfig } = require('../db');
const { addDays } = require('./schedule');

function xpToReachLevel(level, base, increment) {
  return Math.round(base + (level - 1) * increment);
}

/** Derive {level, xpIntoLevel, xpForNextLevel} from a cumulative total XP value. */
function levelFromTotalXp(totalXp) {
  const base = getConfig('level_xp_base');
  const increment = getConfig('level_xp_increment');
  let level = 1;
  let remaining = totalXp;
  // Safety cap to avoid infinite loops on corrupted data.
  for (let i = 0; i < 10000; i++) {
    const needed = xpToReachLevel(level, base, increment);
    if (remaining < needed) {
      return { level, xpIntoLevel: remaining, xpForNextLevel: needed };
    }
    remaining -= needed;
    level += 1;
  }
  return { level, xpIntoLevel: remaining, xpForNextLevel: xpToReachLevel(level, base, increment) };
}

function rankFromLevel(level) {
  const ranks = getConfig('ranks');
  let current = ranks[0];
  for (const r of ranks) {
    if (level >= r.minLevel) current = r;
  }
  return current;
}

function nextRankInfo(level) {
  const ranks = getConfig('ranks');
  const sorted = [...ranks].sort((a, b) => a.minLevel - b.minLevel);
  let currentIdx = 0;
  for (let i = 0; i < sorted.length; i++) {
    if (level >= sorted[i].minLevel) currentIdx = i;
  }
  const current = sorted[currentIdx];
  const next = sorted[currentIdx + 1] || null;
  if (!next) return { current, next: null, progress: 1 };
  const span = next.minLevel - current.minLevel;
  const progressed = level - current.minLevel;
  return { current, next, progress: Math.min(1, Math.max(0, progressed / span)) };
}

function getPlayer(userId) {
  return db.prepare('SELECT * FROM player WHERE user_id = ?').get(userId);
}

function getStats(userId) {
  const rows = db.prepare('SELECT stat_key, xp FROM stats WHERE user_id = ?').all(userId);
  const map = {};
  for (const r of rows) map[r.stat_key] = r.xp;
  return map;
}

function ensureStatRow(userId, statKey) {
  const existing = db.prepare('SELECT 1 FROM stats WHERE user_id = ? AND stat_key = ?').get(userId, statKey);
  if (!existing) db.prepare('INSERT INTO stats (user_id, stat_key, xp) VALUES (?, ?, 0)').run(userId, statKey);
}

/**
 * Award XP to a user (and optionally a stat), recording an auditable transaction,
 * and recompute level/rank. Returns info about level-up / rank-up.
 */
function awardXp(userId, amount, reason, { statKey = null, questId = null } = {}) {
  db.prepare(
    'INSERT INTO xp_transactions (id, user_id, amount, reason, stat_key, quest_id) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(randomUUID(), userId, amount, reason, statKey, questId);

  if (statKey) {
    ensureStatRow(userId, statKey);
    db.prepare('UPDATE stats SET xp = xp + ? WHERE user_id = ? AND stat_key = ?').run(amount, userId, statKey);
  }

  const player = getPlayer(userId);
  const prevLevel = player.level;
  const prevRank = player.rank;
  const newTotalXp = player.total_xp + amount;
  const { level: newLevel } = levelFromTotalXp(newTotalXp);
  const newRank = rankFromLevel(newLevel).rank;

  db.prepare('UPDATE player SET total_xp = ?, level = ?, rank = ? WHERE user_id = ?').run(
    newTotalXp,
    newLevel,
    newRank,
    userId
  );

  return {
    leveledUp: newLevel > prevLevel,
    previousLevel: prevLevel,
    newLevel,
    rankedUp: newRank !== prevRank,
    previousRank: prevRank,
    newRank,
  };
}

/** Update streak counters given a completion happened on `dateStr` (YYYY-MM-DD). */
function registerCompletionDay(userId, dateStr) {
  const player = getPlayer(userId);
  let { current_streak: streak, longest_streak: longest, last_completion_date: last } = player;

  if (last === dateStr) {
    // already counted today, no-op
  } else if (last && addDays(last, 1) === dateStr) {
    streak += 1;
  } else {
    streak = 1;
  }
  longest = Math.max(longest, streak);

  db.prepare(
    'UPDATE player SET current_streak = ?, longest_streak = ?, last_completion_date = ? WHERE user_id = ?'
  ).run(streak, longest, dateStr, userId);

  return { streak, longest };
}

/**
 * Recompute streak from scratch by scanning completion history — used after undo,
 * since decrementing a streak counter directly can't safely reconstruct history.
 */
function recomputeStreak(userId) {
  const rows = db
    .prepare('SELECT DISTINCT completed_date FROM quest_completions WHERE user_id = ? ORDER BY completed_date DESC')
    .all(userId);
  const dates = rows.map((r) => r.completed_date);
  let streak = 0;
  let longest = 0;
  let run = 0;
  let prev = null;
  // longest: scan ascending
  const asc = [...dates].reverse();
  for (const d of asc) {
    if (prev && addDays(prev, 1) === d) run += 1;
    else run = 1;
    longest = Math.max(longest, run);
    prev = d;
  }
  // current streak: from most recent date backward, consecutive days
  if (dates.length) {
    streak = 1;
    for (let i = 0; i < dates.length - 1; i++) {
      if (addDays(dates[i + 1], 1) === dates[i]) streak += 1;
      else break;
    }
  }
  const last = dates[0] || null;
  db.prepare(
    'UPDATE player SET current_streak = ?, longest_streak = ?, last_completion_date = ? WHERE user_id = ?'
  ).run(streak, Math.max(longest, streak), last, userId);
  return { streak, longest: Math.max(longest, streak) };
}

/** Check and unlock any newly-earned achievements. Returns array of unlocked achievement defs. */
function checkAchievements(userId) {
  const achievements = getConfig('achievements');
  const player = getPlayer(userId);
  const unlockedKeys = new Set(
    db.prepare('SELECT achievement_key FROM user_achievements WHERE user_id = ?').all(userId).map((r) => r.achievement_key)
  );
  const newlyUnlocked = [];

  for (const a of achievements) {
    if (unlockedKeys.has(a.key)) continue;
    let earned = false;
    switch (a.criteria.type) {
      case 'quests_completed':
        earned = player.total_quests_completed >= a.criteria.value;
        break;
      case 'streak':
        earned = player.current_streak >= a.criteria.value || player.longest_streak >= a.criteria.value;
        break;
      case 'level':
        earned = player.level >= a.criteria.value;
        break;
      case 'rank': {
        const ranks = getConfig('ranks');
        const order = ranks.map((r) => r.rank);
        earned = order.indexOf(player.rank) >= order.indexOf(a.criteria.value);
        break;
      }
      case 'perfect_days':
        earned = player.perfect_days >= a.criteria.value;
        break;
      default:
        earned = false;
    }
    if (earned) {
      db.prepare('INSERT OR IGNORE INTO user_achievements (user_id, achievement_key) VALUES (?, ?)').run(userId, a.key);
      newlyUnlocked.push(a);
    }
  }
  return newlyUnlocked;
}

module.exports = {
  xpToReachLevel,
  levelFromTotalXp,
  rankFromLevel,
  nextRankInfo,
  getPlayer,
  getStats,
  awardXp,
  registerCompletionDay,
  recomputeStreak,
  checkAchievements,
};
