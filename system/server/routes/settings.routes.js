'use strict';

const express = require('express');
const { db } = require('../db');
const { requireAuth } = require('../auth');
const { THEMES } = require('../config/progression');

const router = express.Router();
router.use(requireAuth);

function serialize(row) {
  return {
    theme: row.theme,
    accentColor: row.accent_color,
    soundEnabled: !!row.sound_enabled,
    animationIntensity: row.animation_intensity,
    reducedMotion: !!row.reduced_motion,
    visibleStats: JSON.parse(row.visible_stats),
    dashboardLayout: JSON.parse(row.dashboard_layout),
  };
}

router.get('/', (req, res) => {
  const row = db.prepare('SELECT * FROM settings WHERE user_id = ?').get(req.userId);
  res.json({ settings: serialize(row), availableThemes: THEMES });
});

router.put('/', (req, res) => {
  const row = db.prepare('SELECT * FROM settings WHERE user_id = ?').get(req.userId);
  const b = req.body || {};
  const theme = THEMES.includes(b.theme) ? b.theme : row.theme;

  db.prepare(
    `UPDATE settings SET theme = ?, accent_color = ?, sound_enabled = ?, animation_intensity = ?, reduced_motion = ?, visible_stats = ?, dashboard_layout = ?
     WHERE user_id = ?`
  ).run(
    theme,
    b.accentColor || row.accent_color,
    b.soundEnabled !== undefined ? (b.soundEnabled ? 1 : 0) : row.sound_enabled,
    b.animationIntensity || row.animation_intensity,
    b.reducedMotion !== undefined ? (b.reducedMotion ? 1 : 0) : row.reduced_motion,
    b.visibleStats ? JSON.stringify(b.visibleStats) : row.visible_stats,
    b.dashboardLayout ? JSON.stringify(b.dashboardLayout) : row.dashboard_layout,
    req.userId
  );

  if (b.playerName) {
    db.prepare('UPDATE users SET player_name = ? WHERE id = ?').run(b.playerName, req.userId);
  }
  if (b.avatar) {
    db.prepare('UPDATE users SET avatar = ? WHERE id = ?').run(b.avatar, req.userId);
  }

  const updated = db.prepare('SELECT * FROM settings WHERE user_id = ?').get(req.userId);
  res.json({ settings: serialize(updated) });
});

module.exports = router;
