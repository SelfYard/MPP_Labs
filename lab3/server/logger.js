const pino = require('pino');
const config = require('./config');

module.exports = pino({
  level: config.log.level,
  base: { service: 'books-api' },
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: ['req.headers.authorization', 'req.headers.cookie', '*.password', '*.password_hash'],
});