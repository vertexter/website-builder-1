'use strict';

// All dates are handled as plain 'YYYY-MM-DD' strings in the user's browser-local day
// (the client always sends the date it believes "today" is, avoiding server-timezone bugs).

function dayOfWeek(dateStr) {
  // 0 = Sunday ... 6 = Saturday
  return new Date(`${dateStr}T00:00:00Z`).getUTCDay();
}

/**
 * Determines whether a quest is "due" (should appear as an active quest to complete)
 * on the given date, based on its frequency_type / frequency_data / start_date.
 */
function isQuestDueOn(quest, dateStr) {
  if (!quest.active) return false;
  if (quest.start_date && dateStr < quest.start_date) return false;

  const freq = quest.frequency_type;
  const data = safeParse(quest.frequency_data) || {};

  if (freq === 'daily') return true;

  if (freq === 'weekdays') {
    const days = data.days || [1, 2, 3, 4, 5]; // Mon-Fri default
    return days.includes(dayOfWeek(dateStr));
  }

  if (freq === 'weekly') {
    // Due every day; progress tracked against a weekly target elsewhere (quest_type = weekly).
    return true;
  }

  if (freq === 'monthly') {
    return true;
  }

  if (freq === 'custom') {
    const days = data.days;
    if (Array.isArray(days)) return days.includes(dayOfWeek(dateStr));
    return true;
  }

  return true;
}

function safeParse(json) {
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function startOfWeek(dateStr) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  const day = d.getUTCDay();
  const diff = (day === 0 ? -6 : 1) - day; // Monday as start of week
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().slice(0, 10);
}

function startOfMonth(dateStr) {
  return `${dateStr.slice(0, 7)}-01`;
}

function addDays(dateStr, n) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

module.exports = { isQuestDueOn, dayOfWeek, safeParse, startOfWeek, startOfMonth, addDays };
