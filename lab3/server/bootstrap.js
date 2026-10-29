const bcrypt = require('bcryptjs');
const db = require('./db');
const logger = require('./logger');

async function bootstrapAdmin() {
  const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || '';

  if (!email || !password) {
    logger.info('ADMIN_EMAIL/ADMIN_PASSWORD not set — admin bootstrap skipped');
    return;
  }
  if (password.length < 8) {
    logger.warn('ADMIN_PASSWORD слишком короткий (< 8) — пропускаю bootstrap');
    return;
  }

  const existing = db.prepare('SELECT id, role FROM users WHERE email = ?').get(email);
  if (existing) {
    if (existing.role !== 'admin') {
      db.prepare("UPDATE users SET role = 'admin' WHERE id = ?").run(existing.id);
      logger.info({ email }, 'existing user promoted to admin');
    } else {
      logger.info({ email }, 'admin already exists');
    }
    return;
  }

  const hash = await bcrypt.hash(password, 10);
  db.prepare('INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)')
    .run(email, hash, 'admin');
  logger.info({ email }, 'admin user created');
}

module.exports = { bootstrapAdmin };