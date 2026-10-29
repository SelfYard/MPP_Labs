const app = require('./app');
const logger = require('./logger');
const { bootstrapAdmin } = require('./bootstrap');

const PORT = process.env.PORT || 3001;

bootstrapAdmin()
  .then(() => app.listen(PORT, () => logger.info({ port: PORT }, 'API started')))
  .catch((err) => { logger.error({ err }, 'bootstrap failed'); process.exit(1); });