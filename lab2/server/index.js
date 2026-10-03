const path = require('path');
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const storage = multer.diskStorage({
  destination: path.join(__dirname, 'uploads'),
  filename: (req, file, cb) => {
    const safe = file.originalname.replace(/[^\w.\-]/g, '_');
    cb(null, `${Date.now()}_${safe}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Разрешены только изображения'));
    }
    cb(null, true);
  },
});

function validateBook({ title, author }) {
  const errors = [];
  if (!title || typeof title !== 'string' || title.trim().length < 1)
    errors.push('title обязателен');
  if (!author || typeof author !== 'string' || author.trim().length < 1)
    errors.push('author обязателен');
  return errors;
}

app.get('/api/books', (req, res) => {
  const rows = db.prepare('SELECT * FROM books ORDER BY id DESC').all();
  res.json(rows);
});

app.get('/api/books/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM books WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Книга не найдена' });
  res.json(row);
});

app.post('/api/books', upload.single('cover'), (req, res) => {
  const errors = validateBook(req.body);
  if (errors.length) return res.status(400).json({ errors });

  const cover = req.file ? `/uploads/${req.file.filename}` : null;
  const info = db
    .prepare('INSERT INTO books (title, author, cover) VALUES (?, ?, ?)')
    .run(req.body.title.trim(), req.body.author.trim(), cover);

  const created = db
    .prepare('SELECT * FROM books WHERE id = ?')
    .get(info.lastInsertRowid);
  res.status(201).json(created);
});

app.put('/api/books/:id', upload.single('cover'), (req, res) => {
  const existing = db
    .prepare('SELECT * FROM books WHERE id = ?')
    .get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Книга не найдена' });

  const errors = validateBook(req.body);
  if (errors.length) return res.status(400).json({ errors });

  const cover = req.file ? `/uploads/${req.file.filename}` : existing.cover;
  db.prepare('UPDATE books SET title = ?, author = ?, cover = ? WHERE id = ?')
    .run(req.body.title.trim(), req.body.author.trim(), cover, req.params.id);

  const updated = db
    .prepare('SELECT * FROM books WHERE id = ?')
    .get(req.params.id);
  res.json(updated);
});

app.delete('/api/books/:id', (req, res) => {
  const info = db.prepare('DELETE FROM books WHERE id = ?').run(req.params.id);
  if (info.changes === 0)
    return res.status(404).json({ error: 'Книга не найдена' });
  res.status(200).json({ ok: true });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(400).json({ error: err.message || 'Ошибка запроса' });
});

app.listen(PORT, () => console.log(`API: http://localhost:${PORT}`));