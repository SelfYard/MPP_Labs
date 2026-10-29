const express = require('express');
const db = require('../db');
const { upload, removeUpload } = require('../middleware/upload');
const { validateBook } = require('../middleware/validate');
const { HttpError } = require('../middleware/errors');

const router = express.Router();

const qAll    = db.prepare('SELECT * FROM books ORDER BY id DESC');
const qOne    = db.prepare('SELECT * FROM books WHERE id = ?');
const qInsert = db.prepare('INSERT INTO books (title, author, cover) VALUES (?, ?, ?)');
const qUpdate = db.prepare('UPDATE books SET title = ?, author = ?, cover = ? WHERE id = ?');
const qDelete = db.prepare('DELETE FROM books WHERE id = ?');

function getOr404(id) {
  const book = qOne.get(id);
  if (!book) throw new HttpError(404, 'Книга не найдена');
  return book;
}

router.get('/', (req, res) => {
  res.json(qAll.all());
});

router.get('/:id', (req, res) => {
  res.json(getOr404(req.params.id));
});

router.post('/', upload.single('cover'), (req, res) => {
  const { errors, value } = validateBook(req.body);
  if (errors.length) {
    if (req.file) removeUpload(`/uploads/${req.file.filename}`);
    throw new HttpError(400, 'Ошибка валидации', errors);
  }

  const cover = req.file ? `/uploads/${req.file.filename}` : null;
  const info = qInsert.run(value.title, value.author, cover);
  res.status(201).json(qOne.get(info.lastInsertRowid));
});

router.put('/:id', upload.single('cover'), (req, res) => {
  const existing = getOr404(req.params.id);

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
  qDelete.run(req.params.id);
  if (existing.cover) removeUpload(existing.cover);
  res.json({ ok: true, id: Number(req.params.id) });
});

module.exports = router;