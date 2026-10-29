const { verifyAccess } = require('../services/tokens');
const { HttpError } = require('./errors');

function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const [type, token] = header.split(' ');
  if (type !== 'Bearer' || !token) {
    res.set('WWW-Authenticate', 'Bearer realm="api"');
    return next(new HttpError(401, 'Требуется аутентификация'));
  }
  try {
    const payload = verifyAccess(token);
    req.user = { id: payload.sub, role: payload.role, email: payload.email };
    if (req.log && req.log.child) {
      req.log = req.log.child({ user_id: req.user.id, role: req.user.role });
    }
    next();
  } catch {
    res.set('WWW-Authenticate', 'Bearer realm="api", error="invalid_token"');
    next(new HttpError(401, 'Недействительный или просроченный токен'));
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return next(new HttpError(401, 'Требуется аутентификация'));
    if (!roles.includes(req.user.role)) return next(new HttpError(403, 'Недостаточно прав'));
    next();
  };
}

module.exports = { authenticate, requireRole };