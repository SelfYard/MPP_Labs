const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const config = require('../config');

const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');

function signAccess(user) {
  return jwt.sign(
    { sub: user.id, role: user.role, email: user.email },
    config.jwt.accessSecret,
    { expiresIn: config.jwt.accessTtl },
  );
}

function verifyAccess(token) {
  return jwt.verify(token, config.jwt.accessSecret);
}

function newRefreshToken() {
  const jti = crypto.randomUUID();
  const raw = crypto.randomBytes(48).toString('hex');
  return { jti, raw, hash: sha256(raw), cookie: `${jti}.${raw}` };
}

module.exports = { signAccess, verifyAccess, newRefreshToken, sha256 };