'use strict';

const path = require('path');
const express = require('express');
require('./env')();

const authRoutes = require('./routes/auth.routes');
const questsRoutes = require('./routes/quests.routes');
const playerRoutes = require('./routes/player.routes');
const settingsRoutes = require('./routes/settings.routes');
const adminRoutes = require('./routes/admin.routes');

const app = express();
app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'ok', system: 'online' }));

app.use('/api/auth', authRoutes);
app.use('/api/quests', questsRoutes);
app.use('/api/player', playerRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/admin', adminRoutes);

app.use(express.static(path.join(__dirname, '..', 'public')));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.SYSTEM_PORT || process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`THE SYSTEM is online — listening on :${PORT}`);
});
