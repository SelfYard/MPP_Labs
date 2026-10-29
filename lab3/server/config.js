module.exports = {
  jwt: {
    accessSecret:  process.env.JWT_ACCESS_SECRET  || 'dev-access-secret-change-me',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-me',
    accessTtl:  15 * 60,
    refreshTtl: 7 * 24 * 60 * 60,
  },
  security: {
    maxFailedAttempts: 5,
    lockDurationMs:    15 * 60 * 1000,
    resetTokenTtlMs:   15 * 60 * 1000,
  },
  mail: {
    host:      process.env.SMTP_HOST || 'mailhog',
    port:      Number(process.env.SMTP_PORT || 1025),
    from:      process.env.SMTP_FROM || 'noreply@books.local',
    publicUrl: process.env.PUBLIC_URL || 'http://localhost:8080',
  },
  log: { level: process.env.LOG_LEVEL || 'info' },
};