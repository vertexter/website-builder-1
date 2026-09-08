'use strict';

const express = require('express');
const { db } = require('../db');
const {
  createUser,
  getUserByEmail,
  verifyPassword,
  signToken,
  sanitizeUser,
  requireAuth,
} = require('../auth');
const { ONBOARDING_FOCUS_AREAS } = require('../config/progression');
const { createStarterQuests } = require('../lib/seed');

const router = express.Router();

router.post('/guest', (req, res) => {
  // Personal mode: instantly create a local, private player profile — no email/password needed.
  const playerName = (req.body && req.body.playerName) || 'Player';
  const user = createUser({ playerName, isGuest: true });
  const token = signToken({ sub: user.id });
  res.json({ token, user: sanitizeUser(user) });
});

router.post('/register', (req, res) => {
  const { email, password, playerName } = req.body || {};
  if (!email || !password || !playerName) {
    return res.status(400).json({ error: 'email, password and playerName are required' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }
  if (getUserByEmail(email)) {
    return res.status(409).json({ error: 'An account with this email already exists' });
  }
  const user = createUser({ email, password, playerName });
  const token = signToken({ sub: user.id });
  res.status(201).json({ token, user: sanitizeUser(user) });
});

router.post('/login', (req, res) => {
  const { email, password } = req.body || {};
  const user = getUserByEmail(email || '');
  if (!user || !user.password_hash || !verifyPassword(password || '', user.password_hash, user.password_salt)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  const token = signToken({ sub: user.id });
  res.json({ token, user: sanitizeUser(user) });
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: sanitizeUser(req.user) });
});

router.get('/onboarding-options', (req, res) => {
  res.json({ focusAreas: ONBOARDING_FOCUS_AREAS });
});

router.post('/onboarding', requireAuth, (req, res) => {
  const { focusAreas, goal, playerName, today } = req.body || {};
  const todayStr = today || new Date().toISOString().slice(0, 10);
  const keys = (focusAreas || []).map((f) => f.key || f);

  if (playerName) {
    db.prepare('UPDATE users SET player_name = ? WHERE id = ?').run(playerName, req.userId);
  }
  db.prepare('UPDATE users SET onboarded = 1 WHERE id = ?').run(req.userId);

  const questIds = createStarterQuests(req.userId, keys, todayStr);

  db.prepare(
    `INSERT INTO missions (id, user_id, name, description, mission_type, target, progress, xp_reward, start_date, end_date, status)
     VALUES (?, ?, ?, ?, 'long_term', 90, 0, 500, ?, NULL, 'active')`
  ).run(require('crypto').randomUUID(), req.userId, 'The First Ascent', `Maintain a 90-day streak toward: ${goal || 'becoming stronger'}.`, todayStr);

  res.json({ questIds, goal: goal || null });
});

module.exports = router;
