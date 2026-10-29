const path = require('path');
const express = require('express');
const booksRouter = require('./routes/books');
const { notFound, errorHandler } = require('./middleware/errors');

const app = express();

app.use(express.json({ limit: '64kb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/health', (req, res) => res.json({ ok: true }));
app.use('/api/books', booksRouter);

app.use(notFound);
app.use(errorHandler);

module.exports = app;