class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

function notFound(req, res) {
  res.status(404).json({
    error: { code: 'NOT_FOUND', message: 'Ресурс не найден' },
  });
}

function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  const code =
    err.code ||
    (status === 404 ? 'NOT_FOUND'
      : status === 400 ? 'BAD_REQUEST'
      : status === 413 ? 'PAYLOAD_TOO_LARGE'
      : 'INTERNAL');

  if (status >= 500) console.error('[500]', err);

  res.status(status).json({
    error: {
      code,
      message: err.message || 'Ошибка запроса',
      details: err.details,
    },
  });
}

module.exports = { HttpError, notFound, errorHandler };