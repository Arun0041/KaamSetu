import { createApp } from './app.js';
import { migrate } from './db/migrate.js';
import { pingDatabase } from './db/pool.js';
import { seedSourcesIfEmpty, seedUsersIfEmpty } from './db/seed.js';
import { logger } from './lib/logger.js';
import { env } from './config/env.js';

async function start() {
  const app = createApp();
  const port = env.PORT;

  const dbUp = await pingDatabase();
  if (dbUp) {
    try {
      await migrate();
      if (env.NODE_ENV === 'development') {
        await seedSourcesIfEmpty();
        await seedUsersIfEmpty();
      }
      logger.info('Database ready');
    } catch (err) {
      logger.error({ err }, 'Database setup failed; starting without database');
    }
  } else {
    logger.warn('Database unreachable; running in degraded mode');
  }

  app.listen(port, () => {
    logger.info({ port, env: env.NODE_ENV }, `KaamSetu API listening on http://localhost:${port}`);
  });
}

start().catch((err) => {
  logger.error({ err }, 'Failed to start server');
  process.exit(1);
});
