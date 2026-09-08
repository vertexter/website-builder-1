'use strict';

const express = require('express');
const { db, getConfig, setConfig } = require('../db');
const { requireAuth, requireAdmin, sanitizeUser } = require('../auth');

const router = express.Router();
router.use(requireAuth, requireAdmin);

router.get('/config', (req, res) => {
  res.json({
    difficultyXp: getConfig('difficulty_xp'),
    ranks: getConfig('ranks'),
    achievements: getConfig('achievements'),
    levelXpBase: getConfig('level_xp_base'),
    levelXpIncrement: getConfig('level_xp_increment'),
  });
});

router.put('/config', (req, res) => {
  const b = req.body || {};
  if (b.difficultyXp) setConfig('difficulty_xp', b.difficultyXp);
  if (b.ranks) setConfig('ranks', b.ranks);
  if (b.achievements) setConfig('achievements', b.achievements);
  if (b.levelXpBase !== undefined) setConfig('level_xp_base', b.levelXpBase);
  if (b.levelXpIncrement !== undefined) setConfig('level_xp_increment', b.levelXpIncrement);
  res.json({ ok: true });
});

router.get('/users', (req, res) => {
  const users = db.prepare('SELECT * FROM users ORDER BY created_at DESC').all();
  const players = db.prepare('SELECT * FROM player').all();
  const playerMap = new Map(players.map((p) => [p.user_id, p]));
  res.json({
    users: users.map((u) => ({ ...sanitizeUser(u), player: playerMap.get(u.id) || null })),
  });
});

module.exports = router;
