'use strict';

const express = require('express');
const { randomUUID } = require('crypto');
const { db, getConfig } = require('../db');
const { requireAuth } = require('../auth');
const { isQuestDueOn, startOfWeek, startOfMonth } = require('../lib/schedule');
const { awardXp, registerCompletionDay, recomputeStreak, checkAchievements, getPlayer } = require('../lib/xp');
const { DIFFICULTY_ORDER } = require('../config/progression');

const router = express.Router();
router.use(requireAuth);

function todayParam(req) {
  return (req.query.date || req.body?.date || new Date().toISOString().slice(0, 10));
}

function periodCompletionCount(userId, questId, sinceDate) {
  return db
    .prepare('SELECT COUNT(*) as c FROM quest_completions WHERE user_id = ? AND quest_id = ? AND completed_date >= ?')
    .get(userId, questId, sinceDate).c;
}

function serializeQuest(userId, quest, dateStr) {
  const completion = db
    .prepare('SELECT * FROM quest_completions WHERE quest_id = ? AND completed_date = ?')
    .get(quest.id, dateStr);

  let periodProgress = null;
  if (quest.quest_type === 'weekly') {
    periodProgress = { current: periodCompletionCount(userId, quest.id, startOfWeek(dateStr)), target: quest.target_count || 1 };
  } else if (quest.quest_type === 'monthly') {
    periodProgress = { current: periodCompletionCount(userId, quest.id, startOfMonth(dateStr)), target: quest.target_count || 1 };
  }

  return {
    id: quest.id,
    name: quest.name,
    notes: quest.notes,
    statKey: quest.stat_key,
    difficulty: quest.difficulty,
    xpReward: quest.xp_reward,
    questType: quest.quest_type,
    frequencyType: quest.frequency_type,
    frequencyData: JSON.parse(quest.frequency_data || '{}'),
    targetCount: quest.target_count,
    isBoss: !!quest.is_boss,
    active: !!quest.active,
    startDate: quest.start_date,
    completed: !!completion,
    completedAt: completion ? completion.created_at : null,
    periodProgress,
  };
}

// GET /api/quests?date=YYYY-MM-DD  -> today's due quests
router.get('/', (req, res) => {
  const dateStr = todayParam(req);
  const quests = db.prepare('SELECT * FROM quests WHERE user_id = ? AND active = 1').all(req.userId);
  const due = quests.filter((q) => isQuestDueOn(q, dateStr));
  res.json({ date: dateStr, quests: due.map((q) => serializeQuest(req.userId, q, dateStr)) });
});

// GET /api/quests/all -> full quest list (management view), including inactive
router.get('/all', (req, res) => {
  const quests = db.prepare('SELECT * FROM quests WHERE user_id = ? ORDER BY created_at DESC').all(req.userId);
  const dateStr = todayParam(req);
  res.json({ quests: quests.map((q) => serializeQuest(req.userId, q, dateStr)) });
});

router.post('/', (req, res) => {
  const b = req.body || {};
  if (!b.name || !b.name.trim()) return res.status(400).json({ error: 'name is required' });
  const difficulty = DIFFICULTY_ORDER.includes(b.difficulty) ? b.difficulty : 'normal';
  const difficultyXp = getConfig('difficulty_xp');
  const xpReward = Number.isFinite(b.xpReward) ? Math.max(1, Math.round(b.xpReward)) : difficultyXp[difficulty];

  const id = randomUUID();
  db.prepare(
    `INSERT INTO quests (id, user_id, name, notes, stat_key, difficulty, xp_reward, quest_type, frequency_type, frequency_data, target_count, active, is_boss, start_date)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`
  ).run(
    id,
    req.userId,
    b.name.trim(),
    b.notes || null,
    b.statKey || null,
    difficulty,
    xpReward,
    b.questType || 'daily',
    b.frequencyType || 'daily',
    JSON.stringify(b.frequencyData || {}),
    b.targetCount || null,
    difficulty === 'boss' ? 1 : b.isBoss ? 1 : 0,
    b.startDate || new Date().toISOString().slice(0, 10)
  );

  const quest = db.prepare('SELECT * FROM quests WHERE id = ?').get(id);
  res.status(201).json({ quest: serializeQuest(req.userId, quest, todayParam(req)) });
});

router.put('/:id', (req, res) => {
  const quest = db.prepare('SELECT * FROM quests WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!quest) return res.status(404).json({ error: 'Quest not found' });
  const b = req.body || {};
  const difficulty = DIFFICULTY_ORDER.includes(b.difficulty) ? b.difficulty : quest.difficulty;
  const difficultyXp = getConfig('difficulty_xp');
  const xpReward = Number.isFinite(b.xpReward) ? Math.max(1, Math.round(b.xpReward)) : (b.difficulty ? difficultyXp[difficulty] : quest.xp_reward);

  db.prepare(
    `UPDATE quests SET name = ?, notes = ?, stat_key = ?, difficulty = ?, xp_reward = ?, quest_type = ?, frequency_type = ?, frequency_data = ?, target_count = ?, active = ?, is_boss = ?
     WHERE id = ?`
  ).run(
    b.name?.trim() || quest.name,
    b.notes !== undefined ? b.notes : quest.notes,
    b.statKey !== undefined ? b.statKey : quest.stat_key,
    difficulty,
    xpReward,
    b.questType || quest.quest_type,
    b.frequencyType || quest.frequency_type,
    b.frequencyData ? JSON.stringify(b.frequencyData) : quest.frequency_data,
    b.targetCount !== undefined ? b.targetCount : quest.target_count,
    b.active !== undefined ? (b.active ? 1 : 0) : quest.active,
    b.isBoss !== undefined ? (b.isBoss ? 1 : 0) : quest.is_boss,
    quest.id
  );

  const updated = db.prepare('SELECT * FROM quests WHERE id = ?').get(quest.id);
  res.json({ quest: serializeQuest(req.userId, updated, todayParam(req)) });
});

router.delete('/:id', (req, res) => {
  const quest = db.prepare('SELECT * FROM quests WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!quest) return res.status(404).json({ error: 'Quest not found' });
  db.prepare('DELETE FROM quests WHERE id = ?').run(quest.id);
  res.json({ ok: true });
});

function checkPerfectDay(userId, dateStr) {
  const player = getPlayer(userId);
  if (player.last_perfect_date === dateStr) return false; // already counted

  const quests = db.prepare('SELECT * FROM quests WHERE user_id = ? AND active = 1').all(userId);
  const dueDaily = quests.filter((q) => q.quest_type === 'daily' && isQuestDueOn(q, dateStr));
  if (!dueDaily.length) return false;

  const doneToday = new Set(
    db
      .prepare('SELECT quest_id FROM quest_completions WHERE user_id = ? AND completed_date = ?')
      .all(userId, dateStr)
      .map((r) => r.quest_id)
  );
  const allDone = dueDaily.every((q) => doneToday.has(q.id));
  if (!allDone) return false;

  db.prepare('UPDATE player SET perfect_days = perfect_days + 1, last_perfect_date = ? WHERE user_id = ?').run(
    dateStr,
    userId
  );
  return true;
}

function updateMissionProgress(userId) {
  const player = getPlayer(userId);
  const missions = db.prepare("SELECT * FROM missions WHERE user_id = ? AND status = 'active'").all(userId);
  for (const m of missions) {
    if (m.name === 'The First Ascent') {
      const progress = Math.min(m.target, player.current_streak);
      db.prepare('UPDATE missions SET progress = ? WHERE id = ?').run(progress, m.id);
      if (progress >= m.target) {
        db.prepare("UPDATE missions SET status = 'completed' WHERE id = ?").run(m.id);
      }
    }
  }
}

// POST /api/quests/:id/complete { date }
router.post('/:id/complete', (req, res) => {
  const quest = db.prepare('SELECT * FROM quests WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!quest) return res.status(404).json({ error: 'Quest not found' });
  const dateStr = todayParam(req);

  const existing = db
    .prepare('SELECT * FROM quest_completions WHERE quest_id = ? AND completed_date = ?')
    .get(quest.id, dateStr);
  if (existing) {
    return res.status(409).json({ error: 'Quest already completed for this date' });
  }

  db.prepare(
    'INSERT INTO quest_completions (id, quest_id, user_id, completed_date, xp_awarded) VALUES (?, ?, ?, ?, ?)'
  ).run(randomUUID(), quest.id, req.userId, dateStr, quest.xp_reward);

  db.prepare('UPDATE player SET total_quests_completed = total_quests_completed + 1 WHERE user_id = ?').run(req.userId);

  const xpResult = awardXp(req.userId, quest.xp_reward, 'quest_complete', {
    statKey: quest.stat_key,
    questId: quest.id,
  });
  const { streak, longest } = registerCompletionDay(req.userId, dateStr);
  const perfectDay = checkPerfectDay(req.userId, dateStr);
  updateMissionProgress(req.userId);
  const unlocked = checkAchievements(req.userId);

  res.json({
    xpAwarded: quest.xp_reward,
    statKey: quest.stat_key,
    streak,
    longestStreak: longest,
    perfectDay,
    leveledUp: xpResult.leveledUp,
    previousLevel: xpResult.previousLevel,
    newLevel: xpResult.newLevel,
    rankedUp: xpResult.rankedUp,
    previousRank: xpResult.previousRank,
    newRank: xpResult.newRank,
    achievementsUnlocked: unlocked,
  });
});

// POST /api/quests/:id/undo { date }
router.post('/:id/undo', (req, res) => {
  const quest = db.prepare('SELECT * FROM quests WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!quest) return res.status(404).json({ error: 'Quest not found' });
  const dateStr = todayParam(req);

  const completion = db
    .prepare('SELECT * FROM quest_completions WHERE quest_id = ? AND completed_date = ?')
    .get(quest.id, dateStr);
  if (!completion) return res.status(404).json({ error: 'No completion found for this date' });

  db.prepare('DELETE FROM quest_completions WHERE id = ?').run(completion.id);
  db.prepare(
    'UPDATE player SET total_quests_completed = MAX(0, total_quests_completed - 1) WHERE user_id = ?'
  ).run(req.userId);

  awardXp(req.userId, -completion.xp_awarded, 'quest_undo', { statKey: quest.stat_key, questId: quest.id });
  const { streak, longest } = recomputeStreak(req.userId);
  updateMissionProgress(req.userId);

  res.json({ ok: true, streak, longestStreak: longest });
});

module.exports = router;
