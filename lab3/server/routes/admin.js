const express = require('express');
const db = require('../db');
const { HttpError } = require('../middleware/errors');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate, requireRole('admin'));

const VALID_ROLES = ['user', 'moderator', 'admin'];

const qListUsers  = db.prepare(
  'SELECT id, email, role, created_at, failed_attempts, locked_until FROM users ORDER BY id ASC'
);
const qUserById   = db.prepare('SELECT id, email, role FROM users WHERE id = ?');
const qUpdateRole = db.prepare('UPDATE users SET role = ? WHERE id = ?');
const qDeleteUser = db.prepare('DELETE FROM users WHERE id = ?');
const qCountAdmins = db.prepare("SELECT COUNT(*) AS c FROM users WHERE role = 'admin'");

router.get('/users', (req, res) => {
  res.json(qListUsers.all());
});

router.patch('/users/:id/role', (req, res) => {
  const id = Number(req.params.id);
  const role = String(req.body.role || '');

  if (!VALID_ROLES.includes(role)) {
    throw new HttpError(400, 'Ошибка валидации',
      [{ field: 'role', message: 'Роль должна быть user | moderator | admin' }]);
  }
  if (id === req.user.id) {
    throw new HttpError(409, 'Нельзя менять собственную роль');
  }

  const user = qUserById.get(id);
  if (!user) throw new HttpError(404, 'Пользователь не найден');

  if (user.role === 'admin' && role !== 'admin') {
    const { c } = qCountAdmins.get();
    if (c <= 1) throw new HttpError(409, 'Нельзя понизить последнего администратора');
  }

  qUpdateRole.run(role, id);
  req.log?.info({ targetUserId: id, newRole: role }, 'role changed');
  res.json(qUserById.get(id));
});

router.delete('/users/:id', (req, res) => {
  const id = Number(req.params.id);
  if (id === req.user.id) throw new HttpError(409, 'Нельзя удалить себя');

  const user = qUserById.get(id);
  if (!user) throw new HttpError(404, 'Пользователь не найден');

  if (user.role === 'admin') {
    const { c } = qCountAdmins.get();
    if (c <= 1) throw new HttpError(409, 'Нельзя удалить последнего администратора');
  }

  qDeleteUser.run(id);
  req.log?.info({ targetUserId: id }, 'user deleted');
  res.status(204).end();
});

router.get('/stats', (req, res) => {
  const users   = db.prepare('SELECT COUNT(*) AS c FROM users').get().c;
  const books   = db.prepare('SELECT COUNT(*) AS c FROM books').get().c;
  const admins  = db.prepare("SELECT COUNT(*) AS c FROM users WHERE role='admin'").get().c;
  const mods    = db.prepare("SELECT COUNT(*) AS c FROM users WHERE role='moderator'").get().c;
  res.json({ users, books, admins, moderators: mods });
});

module.exports = router;