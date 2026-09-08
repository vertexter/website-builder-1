'use strict';

const { db } = require('../db');
const { isQuestDueOn, addDays } = require('./schedule');

/** Count of quests due and completed for a user on a specific date. */
function dueAndCompletedOn(userId, dateStr, allQuests) {
  const due = allQuests.filter((q) => isQuestDueOn(q, dateStr));
  if (!due.length) return { due: 0, completed: 0 };
  const doneIds = new Set(
    db
      .prepare('SELECT quest_id FROM quest_completions WHERE user_id = ? AND completed_date = ?')
      .all(userId, dateStr)
      .map((r) => r.quest_id)
  );
  const completed = due.filter((q) => doneIds.has(q.id)).length;
  return { due: due.length, completed };
}

/** Aggregate completion rate across a range of dates ending at `endDate` (inclusive), going back `days`. */
function completionRateOverRange(userId, endDate, days) {
  const allQuests = db.prepare('SELECT * FROM quests WHERE user_id = ?').all(userId);
  let dueSum = 0;
  let completedSum = 0;
  let cursor = addDays(endDate, -(days - 1));
  const daily = [];
  for (let i = 0; i < days; i++) {
    const { due, completed } = dueAndCompletedOn(userId, cursor, allQuests);
    dueSum += due;
    completedSum += completed;
    daily.push({ date: cursor, due, completed, rate: due ? completed / due : null });
    cursor = addDays(cursor, 1);
  }
  return { rate: dueSum ? completedSum / dueSum : 0, dueSum, completedSum, daily };
}

module.exports = { dueAndCompletedOn, completionRateOverRange };
