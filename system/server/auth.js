'use strict';

const crypto = require('crypto');
const { randomUUID } = require('crypto');
const { db } = require('./db');

const SECRET = process.env.SYSTEM_SECRET || 'dev-insecure-secret-change-in-production';
const TOKEN_TTL_MS = 90 * 24 * 60 * 60 * 1000; // 90 days

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { hash, salt };
}

function verifyPassword(password, hash, salt) {
  const candidate = crypto.scryptSync(password, salt, 64).toString('hex');
  const a = Buffer.from(candidate, 'hex');
  const b = Buffer.from(hash, 'hex');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function base64url(input) {
  return Buffer.from(input).toString('base64url');
}

function signToken(payload) {
  const body = { ...payload, exp: Date.now() + TOKEN_TTL_MS };
  const encoded = base64url(JSON.stringify(body));
  const sig = crypto.createHmac('sha256', SECRET).update(encoded).digest('base64url');
  return `${encoded}.${sig}`;
}

function verifyToken(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;
  const [encoded, sig] = token.split('.');
  const expected = crypto.createHmac('sha256', SECRET).update(encoded).digest('base64url');
  const a = Buffer.from(sig || '');
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
    if (payload.exp && payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

function createUser({ email = null, password = null, playerName, isGuest = false }) {
  const id = randomUUID();
  let passwordHash = null;
  let passwordSalt = null;
  if (password) {
    const { hash, salt } = hashPassword(password);
    passwordHash = hash;
    passwordSalt = salt;
  }
  db.prepare(
    'INSERT INTO users (id, email, password_hash, password_salt, player_name, is_guest) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(id, email, passwordHash, passwordSalt, playerName, isGuest ? 1 : 0);

  db.prepare('INSERT INTO settings (user_id) VALUES (?)').run(id);
  db.prepare('INSERT INTO player (user_id) VALUES (?)').run(id);

  return getUserById(id);
}

function getUserById(id) {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
}

function getUserByEmail(email) {
  return db.prepare('SELECT * FROM users WHERE email = ?').get(email);
}

function sanitizeUser(user) {
  if (!user) return null;
  const { password_hash, password_salt, ...rest } = user;
  return { ...rest, isGuest: !!rest.is_guest, isAdmin: !!rest.is_admin, onboarded: !!rest.onboarded };
}

/** Express middleware: requires a valid Bearer token, attaches req.userId / req.user. */
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  const payload = verifyToken(token);
  if (!payload || !payload.sub) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const user = getUserById(payload.sub);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  req.userId = user.id;
  req.user = user;
  next();
}

function requireAdmin(req, res, next) {
  if (!req.user || !req.user.is_admin) return res.status(403).json({ error: 'Admin access required' });
  next();
}

module.exports = {
  hashPassword,
  verifyPassword,
  signToken,
  verifyToken,
  createUser,
  getUserById,
  getUserByEmail,
  sanitizeUser,
  requireAuth,
  requireAdmin,
};
