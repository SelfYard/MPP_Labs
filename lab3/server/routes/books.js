const express = require('express');
const db = require('../db');
const { upload, removeUpload } = require('../middleware/upload');
const { validateBook } = require('../middleware/validate');
const { HttpError } = require('../middleware/errors');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

const qAll = db.prepare(`
  SELECT b.*, u.email AS owner_email
  FROM books b LEFT JOIN users u ON u.id = b.owner_id
  ORDER BY b.id DESC
`);
const qOwn = db.prepare(`
  SELECT b.*, u.email AS owner_email
  FROM books b LEFT JOIN users u ON u.id = b.owner_id
  WHERE b.owner_id = ? ORDER BY b.id DESC
`);
const qOne = db.prepare(`
  SELECT b.*, u.email AS owner_email
  FROM books b LEFT JOIN users u ON u.id = b.owner_id
  WHERE b.id = ?
`);
const qInsert = db.prepare('INSERT INTO books (title, author, cover, owner_id) VALUES (?, ?, ?, ?)');
const qUpdate = db.prepare('UPDATE books SET title = ?, author = ?, cover = ? WHERE id = ?');
const qDelete = db.prepare('DELETE FROM books WHERE id = ?');

function getOr404(id) {
  const book = qOne.get(id);
  if (!book) throw new HttpError(404, 'Книга не найдена');
  return book;
}

function assertCanModify(user, book) {
  if (user.role === 'admin' || user.role === 'moderator') return;
  if (book.owner_id !== user.id)
    throw new HttpError(403, 'Нет прав на изменение этого ресурса');
}

router.get('/', (req, res) => {
  const rows = req.user.role === 'user'
    ? qOwn.all(req.user.id)
    : qAll.all();
  res.json(rows);
});

router.get('/:id', (req, res) => {
  const book = getOr404(req.params.id);
  if (req.user.role === 'user' && book.owner_id !== req.user.id)
    throw new HttpError(403, 'Нет доступа к этому ресурсу');
  res.json(book);
});

router.post('/', upload.single('cover'), (req, res) => {
  const { errors, value } = validateBook(req.body);
  if (errors.length) {
    if (req.file) removeUpload(`/uploads/${req.file.filename}`);
    throw new HttpError(400, 'Ошибка валидации', errors);
  }
  const cover = req.file ? `/uploads/${req.file.filename}` : null;
  const info = qInsert.run(value.title, value.author, cover, req.user.id);
  res.status(201).json(qOne.get(info.lastInsertRowid));
});

router.put('/:id', upload.single('cover'), (req, res) => {
  const existing = getOr404(req.params.id);
  assertCanModify(req.user, existing);

  const { errors, value } = validateBook(req.body);
  if (errors.length) {
    if (req.file) removeUpload(`/uploads/${req.file.filename}`);
    throw new HttpError(400, 'Ошибка валидации', errors);
  }
  const cover = req.file ? `/uploads/${req.file.filename}` : existing.cover;
  if (req.file && existing.cover) removeUpload(existing.cover);

  qUpdate.run(value.title, value.author, cover, req.params.id);
  res.json(qOne.get(req.params.id));
});

router.delete('/:id', (req, res) => {
  const existing = getOr404(req.params.id);
  assertCanModify(req.user, existing);
  qDelete.run(req.params.id);
  if (existing.cover) removeUpload(existing.cover);
  res.status(204).end();
});

module.exports = router;