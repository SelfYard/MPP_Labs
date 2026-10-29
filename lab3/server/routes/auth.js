const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const db = require('../db');
const config = require('../config');
const { HttpError } = require('../middleware/errors');
const { authenticate } = require('../middleware/auth');
const { signAccess, newRefreshToken, sha256 } = require('../services/tokens');
const { sendPasswordReset } = require('../services/mailer');

const router = express.Router();
const REFRESH_COOKIE = 'refresh_token';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: { code: 'TOO_MANY_REQUESTS', message: 'Слишком много попыток, попробуйте позже' } },
});

const qUserByEmail = db.prepare('SELECT * FROM users WHERE email = ?');
const qUserById    = db.prepare('SELECT id, email, role FROM users WHERE id = ?');
const qInsertUser  = db.prepare('INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)');

const qFail = db.prepare('UPDATE users SET failed_attempts = failed_attempts + 1, locked_until = ? WHERE id = ?');
const qOk   = db.prepare('UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE id = ?');

const qInsertRefresh = db.prepare(
  'INSERT INTO refresh_tokens (jti, user_id, token_hash, ip, user_agent, expires_at) VALUES (?, ?, ?, ?, ?, ?)'
);
const qFindRefresh   = db.prepare('SELECT * FROM refresh_tokens WHERE jti = ? AND revoked = 0');
const qRevokeRefresh = db.prepare('UPDATE refresh_tokens SET revoked = 1 WHERE jti = ?');
const qRevokeAll     = db.prepare('UPDATE refresh_tokens SET revoked = 1 WHERE user_id = ? AND revoked = 0');
const qListSessions  = db.prepare(
  'SELECT jti, ip, user_agent, created_at, last_seen, expires_at FROM refresh_tokens ' +
  'WHERE user_id = ? AND revoked = 0 AND expires_at > ? ORDER BY created_at DESC'
);

const qInsertReset  = db.prepare('INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES (?, ?, ?)');
const qFindReset    = db.prepare('SELECT * FROM password_resets WHERE token_hash = ? AND used = 0');
const qUseReset     = db.prepare('UPDATE password_resets SET used = 1 WHERE id = ?');
const qSetPassword  = db.prepare('UPDATE users SET password_hash = ?, failed_attempts = 0, locked_until = NULL WHERE id = ?');

function setRefreshCookie(res, value) {
  res.cookie(REFRESH_COOKIE, value, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.COOKIE_SECURE === 'true',
    maxAge: config.jwt.refreshTtl * 1000,
    path: '/api/auth',
  });
}
function clearRefreshCookie(res) {
  res.clearCookie(REFRESH_COOKIE, { path: '/api/auth' });
}

async function issueSession(user, req, res) {
  const { jti, hash, cookie } = newRefreshToken();
  const expiresAt = Date.now() + config.jwt.refreshTtl * 1000;
  qInsertRefresh.run(jti, user.id, hash, req.ip || '', req.headers['user-agent'] || '', expiresAt);
  setRefreshCookie(res, cookie);
  return { accessToken: signAccess(user), expiresIn: config.jwt.accessTtl, jti };
}

router.post('/register', authLimiter, async (req, res, next) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');

    const details = [];
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      details.push({ field: 'email', message: 'Некорректный email' });
    if (password.length < 8)
      details.push({ field: 'password', message: 'Минимум 8 символов' });
    if (details.length) throw new HttpError(400, 'Ошибка валидации', details);

    if (qUserByEmail.get(email))
      throw new HttpError(409, 'Пользователь с таким email уже существует');

    const hash = await bcrypt.hash(password, 10);
    const info = qInsertUser.run(email, hash, 'user');
    const user = { id: Number(info.lastInsertRowid), email, role: 'user' };
    const { jti, ...tokens } = await issueSession(user, req, res);
    res.status(201).json({ user, ...tokens });
  } catch (e) { next(e); }
});

router.post('/login', authLimiter, async (req, res, next) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');

    const user = qUserByEmail.get(email);
    if (!user) throw new HttpError(401, 'Неверный email или пароль');

    if (user.locked_until && user.locked_until > Date.now()) {
      const retry = Math.ceil((user.locked_until - Date.now()) / 1000);
      res.set('Retry-After', String(retry));
      throw new HttpError(423, `Аккаунт заблокирован. Повторите через ${retry} с.`, null, 'LOCKED');
    }

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      const attempts = user.failed_attempts + 1;
      const lockedUntil = attempts >= config.security.maxFailedAttempts
        ? Date.now() + config.security.lockDurationMs
        : null;
      qFail.run(lockedUntil, user.id);
      if (lockedUntil) {
        res.set('Retry-After', String(Math.ceil(config.security.lockDurationMs / 1000)));
        throw new HttpError(423, 'Слишком много неудачных попыток — аккаунт временно заблокирован', null, 'LOCKED');
      }
      throw new HttpError(401, 'Неверный email или пароль');
    }

    qOk.run(user.id);
    const { jti, ...tokens } = await issueSession(user, req, res);
    res.json({ user: { id: user.id, email: user.email, role: user.role }, ...tokens });
  } catch (e) { next(e); }
});

router.post('/refresh', async (req, res, next) => {
  try {
    const cookie = req.cookies[REFRESH_COOKIE];
    if (!cookie) throw new HttpError(401, 'Нет refresh-токена');

    const [jti, raw] = cookie.split('.');
    if (!jti || !raw) throw new HttpError(401, 'Неверный refresh-токен');

    const row = qFindRefresh.get(jti);
    if (!row || row.expires_at < Date.now() || sha256(raw) !== row.token_hash)
      throw new HttpError(401, 'Неверный или просроченный refresh-токен');

    qRevokeRefresh.run(jti);

    const user = qUserById.get(row.user_id);
    if (!user) throw new HttpError(401, 'Пользователь не найден');

    const { jti: _newJti, ...tokens } = await issueSession(user, req, res);
    res.json({ user, ...tokens });
  } catch (e) { next(e); }
});

router.post('/logout', (req, res) => {
  const cookie = req.cookies[REFRESH_COOKIE];
  if (cookie) {
    const [jti] = cookie.split('.');
    if (jti) qRevokeRefresh.run(jti);
  }
  clearRefreshCookie(res);
  res.status(204).end();
});

router.get('/sessions', authenticate, (req, res) => {
  const cookie = req.cookies[REFRESH_COOKIE];
  const currentJti = cookie ? cookie.split('.')[0] : null;
  const rows = qListSessions.all(req.user.id, Date.now());
  res.json(rows.map(r => ({ ...r, current: r.jti === currentJti })));
});

router.delete('/sessions/:jti', authenticate, (req, res, next) => {
  const row = qFindRefresh.get(req.params.jti);
  if (!row || row.user_id !== req.user.id)
    return next(new HttpError(404, 'Сессия не найдена'));

  qRevokeRefresh.run(req.params.jti);
  const cookie = req.cookies[REFRESH_COOKIE];
  if (cookie && cookie.split('.')[0] === req.params.jti) clearRefreshCookie(res);
  res.status(204).end();
});

router.delete('/sessions', authenticate, (req, res) => {
  const cookie = req.cookies[REFRESH_COOKIE];
  const currentJti = cookie ? cookie.split('.')[0] : '';
  db.prepare(
    'UPDATE refresh_tokens SET revoked = 1 WHERE user_id = ? AND revoked = 0 AND jti != ?'
  ).run(req.user.id, currentJti);
  res.status(204).end();
});

router.post('/forgot-password', authLimiter, async (req, res, next) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const user = qUserByEmail.get(email);

    // Не раскрываем существование пользователя
    if (user) {
      const raw = crypto.randomBytes(32).toString('hex');
      const hash = sha256(raw);
      qInsertReset.run(user.id, hash, Date.now() + config.security.resetTokenTtlMs);
      const url = await sendPasswordReset(user.email, raw);
      if (process.env.NODE_ENV !== 'production') {
        return res.status(202).json({
          message: 'Если пользователь существует, письмо отправлено',
          devResetUrl: url,
        });
      }
    }
    res.status(202).json({ message: 'Если пользователь существует, письмо отправлено' });
  } catch (e) { next(e); }
});

router.post('/reset-password', async (req, res, next) => {
  try {
    const token = String(req.body.token || '');
    const password = String(req.body.password || '');

    if (password.length < 8)
      throw new HttpError(400, 'Ошибка валидации',
        [{ field: 'password', message: 'Минимум 8 символов' }]);

    const row = qFindReset.get(sha256(token));
    if (!row || row.expires_at < Date.now())
      throw new HttpError(400, 'Неверный или просроченный токен', null, 'INVALID_RESET_TOKEN');

    const hash = await bcrypt.hash(password, 10);
    qSetPassword.run(hash, row.user_id);
    qUseReset.run(row.id);
    qRevokeAll.run(row.user_id);
    res.status(200).json({ ok: true });
  } catch (e) { next(e); }
});

router.get('/me', authenticate, (req, res) => {
  const user = qUserById.get(req.user.id);
  if (!user) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Пользователь не найден' } });
  res.json(user);
});

module.exports = router;