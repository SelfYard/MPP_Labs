class HttpError extends Error {
  constructor(status, message, details, code) {
    super(message);
    this.status = status;
    this.details = details;
    this.code = code;
  }
}

const STATUS_CODES = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  405: 'METHOD_NOT_ALLOWED',
  409: 'CONFLICT',
  413: 'PAYLOAD_TOO_LARGE',
  415: 'UNSUPPORTED_MEDIA_TYPE',
  422: 'UNPROCESSABLE_ENTITY',
  423: 'LOCKED',
  429: 'TOO_MANY_REQUESTS',
  500: 'INTERNAL_SERVER_ERROR',
};

function notFound(req, res) {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Ресурс не найден' } });
}

function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  const code = err.code || STATUS_CODES[status] || 'INTERNAL_ERROR';

  const log = req.log || console;
  if (status >= 500) log.error({ err }, 'unhandled error');
  else log.warn({ status, code, message: err.message }, 'request error');

  const body = { error: { code, message: err.message || 'Ошибка запроса' } };
  if (err.details) body.error.details = err.details;
  res.status(status).json(body);
}

module.exports = { HttpError, notFound, errorHandler };