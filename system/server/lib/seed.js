'use strict';

const { randomUUID } = require('crypto');
const { db, getConfig } = require('../db');
const { STARTER_QUESTS } = require('../config/progression');

/** Create the first-day quest set based on the focus areas chosen during onboarding. */
function createStarterQuests(userId, focusAreas, todayStr) {
  const difficultyXp = getConfig('difficulty_xp');
  const areas = focusAreas && focusAreas.length ? focusAreas : ['discipline'];
  const chosen = [];
  for (const area of areas) {
    const templates = STARTER_QUESTS[area] || [];
    for (const t of templates) chosen.push(t);
  }
  // Cap the first day at 5 quests so onboarding doesn't overwhelm.
  const finalSet = chosen.slice(0, 5).length ? chosen.slice(0, 5) : STARTER_QUESTS.discipline;

  const insert = db.prepare(
    `INSERT INTO quests (id, user_id, name, stat_key, difficulty, xp_reward, quest_type, frequency_type, frequency_data, active, start_date)
     VALUES (?, ?, ?, ?, ?, ?, 'daily', ?, '{}', 1, ?)`
  );

  const created = [];
  for (const q of finalSet) {
    const id = randomUUID();
    insert.run(id, userId, q.name, q.stat, q.difficulty, difficultyXp[q.difficulty] || 25, q.frequencyType, todayStr);
    created.push(id);
  }
  return created;
}

module.exports = { createStarterQuests };
