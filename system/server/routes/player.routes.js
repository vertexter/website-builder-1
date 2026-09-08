'use strict';

const express = require('express');
const { randomUUID } = require('crypto');
const { db, getConfig } = require('../db');
const { requireAuth } = require('../auth');
const { getPlayer, getStats, levelFromTotalXp, rankFromLevel, nextRankInfo } = require('../lib/xp');
const { completionRateOverRange, dueAndCompletedOn } = require('../lib/period');
const { addDays, startOfMonth, isQuestDueOn } = require('../lib/schedule');
const { STATS } = require('../config/progression');

const router = express.Router();
router.use(requireAuth);

function todayParam(req) {
  return req.query.date || new Date().toISOString().slice(0, 10);
}

router.get('/status', (req, res) => {
  const dateStr = todayParam(req);
  const player = getPlayer(req.userId);
  const { xpIntoLevel, xpForNextLevel } = levelFromTotalXp(player.total_xp);
  const rankInfo = nextRankInfo(player.level);
  const stats = getStats(req.userId);

  const allQuests = db.prepare('SELECT * FROM quests WHERE user_id = ?').all(req.userId);
  const today = dueAndCompletedOn(req.userId, dateStr, allQuests);
  const weekly = completionRateOverRange(req.userId, dateStr, 7);
  const monthly = completionRateOverRange(req.userId, dateStr, 30);

  res.json({
    playerName: req.user.player_name,
    avatar: req.user.avatar,
    level: player.level,
    xpIntoLevel,
    xpForNextLevel,
    totalXp: player.total_xp,
    rank: player.rank,
    nextRank: rankInfo.next ? rankInfo.next.rank : null,
    rankProgress: rankInfo.progress,
    rankLabel: rankInfo.current.label,
    currentStreak: player.current_streak,
    longestStreak: player.longest_streak,
    totalQuestsCompleted: player.total_quests_completed,
    perfectDays: player.perfect_days,
    todayCompleted: today.completed,
    todayDue: today.due,
    weeklyCompletionRate: weekly.rate,
    monthlyCompletionRate: monthly.rate,
    stats,
    statDefs: STATS,
  });
});

router.get('/progression', (req, res) => {
  const player = getPlayer(req.userId);
  const ranks = getConfig('ranks');
  const milestones = [1, 5, 10, 15, 20, 25, 30, 40, 50, 60].map((level) => ({
    level,
    rank: rankFromLevel(level).rank,
    reached: player.level >= level,
    current: false,
  }));
  // mark the highest reached milestone as not "current"; insert a current marker
  let currentIdx = -1;
  milestones.forEach((m, i) => {
    if (player.level >= m.level) currentIdx = i;
  });
  res.json({
    level: player.level,
    rank: player.rank,
    milestones,
    currentMilestoneIndex: currentIdx,
    nextMilestone: milestones.find((m) => m.level > player.level) || null,
    ranks,
  });
});

router.get('/achievements', (req, res) => {
  const achievements = getConfig('achievements');
  const unlocked = db
    .prepare('SELECT achievement_key, unlocked_at FROM user_achievements WHERE user_id = ?')
    .all(req.userId);
  const unlockedMap = new Map(unlocked.map((r) => [r.achievement_key, r.unlocked_at]));
  res.json({
    achievements: achievements.map((a) => ({
      ...a,
      unlocked: unlockedMap.has(a.key),
      unlockedAt: unlockedMap.get(a.key) || null,
    })),
  });
});

router.get('/calendar', (req, res) => {
  const month = req.query.month || new Date().toISOString().slice(0, 7); // YYYY-MM
  const monthStart = `${month}-01`;
  const [y, m] = month.split('-').map(Number);
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();

  const allQuests = db.prepare('SELECT * FROM quests WHERE user_id = ?').all(req.userId);
  const completions = db
    .prepare("SELECT completed_date, COUNT(*) as c, SUM(xp_awarded) as xp FROM quest_completions WHERE user_id = ? AND completed_date >= ? AND completed_date < ? GROUP BY completed_date")
    .all(req.userId, monthStart, addDays(monthStart, daysInMonth));
  const compMap = new Map(completions.map((r) => [r.completed_date, r]));

  const player = getPlayer(req.userId);
  const days = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${month}-${String(d).padStart(2, '0')}`;
    const { due } = dueAndCompletedOn(req.userId, dateStr, allQuests);
    const row = compMap.get(dateStr);
    const completed = row ? row.c : 0;
    days.push({
      date: dateStr,
      due,
      completed,
      xpEarned: row ? row.xp : 0,
      perfect: due > 0 && completed >= due,
      missed: due > 0 && completed === 0 && dateStr < todayParam(req),
    });
  }

  res.json({ month, days });
});

router.get('/analytics', (req, res) => {
  const dateStr = todayParam(req);
  const player = getPlayer(req.userId);

  // XP over the last 30 days
  const xpRows = db
    .prepare(
      `SELECT substr(created_at,1,10) as day, SUM(amount) as xp FROM xp_transactions
       WHERE user_id = ? AND created_at >= datetime(?, '-29 days') GROUP BY day ORDER BY day`
    )
    .all(req.userId, dateStr);
  const xpMap = new Map(xpRows.map((r) => [r.day, r.xp]));
  const xpOverTime = [];
  let cursor = addDays(dateStr, -29);
  for (let i = 0; i < 30; i++) {
    xpOverTime.push({ date: cursor, xp: xpMap.get(cursor) || 0 });
    cursor = addDays(cursor, 1);
  }

  // Weekly performance: last 8 weeks
  const weeklyPerformance = [];
  for (let w = 7; w >= 0; w--) {
    const end = addDays(dateStr, -7 * w);
    const { rate } = completionRateOverRange(req.userId, end, 7);
    weeklyPerformance.push({ weekEnding: end, rate });
  }

  // Stat progression snapshot
  const stats = getStats(req.userId);

  // Best day-of-week (by completion rate) over last 60 days
  const range = completionRateOverRange(req.userId, dateStr, 60);
  const byWeekday = [0, 1, 2, 3, 4, 5, 6].map(() => ({ due: 0, completed: 0 }));
  for (const d of range.daily) {
    const wd = new Date(`${d.date}T00:00:00Z`).getUTCDay();
    byWeekday[wd].due += d.due;
    byWeekday[wd].completed += d.completed;
  }
  const weekdayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const bestDays = byWeekday
    .map((v, i) => ({ day: weekdayNames[i], rate: v.due ? v.completed / v.due : null, due: v.due }))
    .filter((v) => v.due > 0)
    .sort((a, b) => b.rate - a.rate);

  // Weakest habits: completion rate per quest over its lifetime
  const quests = db.prepare('SELECT * FROM quests WHERE user_id = ?').all(req.userId);
  const habitRates = quests.map((q) => {
    const totalCompletions = db
      .prepare('SELECT COUNT(*) as c FROM quest_completions WHERE quest_id = ?')
      .get(q.id).c;
    const start = q.start_date > addDays(dateStr, -60) ? q.start_date : addDays(dateStr, -60);
    let possibleDays = 0;
    let cursor2 = start;
    while (cursor2 <= dateStr) {
      if (isQuestDueOn(q, cursor2)) possibleDays += 1;
      cursor2 = addDays(cursor2, 1);
    }
    return {
      questId: q.id,
      name: q.name,
      completions: totalCompletions,
      possibleDays,
      rate: possibleDays ? Math.min(1, totalCompletions / possibleDays) : null,
    };
  });
  const weakestHabits = habitRates.filter((h) => h.rate !== null).sort((a, b) => a.rate - b.rate).slice(0, 5);

  res.json({
    xpOverTime,
    weeklyPerformance,
    stats,
    statDefs: STATS,
    bestDays,
    weakestHabits,
    totalXp: player.total_xp,
    level: player.level,
    totalQuestsCompleted: player.total_quests_completed,
    perfectDays: player.perfect_days,
  });
});

router.get('/missions', (req, res) => {
  const missions = db.prepare('SELECT * FROM missions WHERE user_id = ? ORDER BY created_at DESC').all(req.userId);
  res.json({ missions });
});

router.post('/missions', (req, res) => {
  const b = req.body || {};
  if (!b.name) return res.status(400).json({ error: 'name is required' });
  const id = randomUUID();
  db.prepare(
    `INSERT INTO missions (id, user_id, name, description, mission_type, target, progress, xp_reward, start_date, end_date, status)
     VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?, 'active')`
  ).run(
    id,
    req.userId,
    b.name,
    b.description || null,
    b.missionType || 'custom',
    b.target || 1,
    b.xpReward || 100,
    b.startDate || new Date().toISOString().slice(0, 10),
    b.endDate || null
  );
  res.status(201).json({ mission: db.prepare('SELECT * FROM missions WHERE id = ?').get(id) });
});

module.exports = router;
