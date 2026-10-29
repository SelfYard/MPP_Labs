const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');
const pinoHttp = require('pino-http');
const logger = require('./logger');

const authRouter  = require('./routes/auth');
const booksRouter = require('./routes/books');
const adminRouter = require('./routes/admin');
const { notFound, errorHandler } = require('./middleware/errors');

const app = express();
app.set('trust proxy', 1);

app.use(pinoHttp({ logger }));
app.use(express.json({ limit: '64kb' }));
app.use(cookieParser());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/health', (req, res) => res.json({ ok: true }));
app.use('/api/auth',  authRouter);
app.use('/api/books', booksRouter);
app.use('/api/admin', adminRouter);

app.use(notFound);
app.use(errorHandler);

module.exports = app;