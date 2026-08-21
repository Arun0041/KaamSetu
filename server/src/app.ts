import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import pinoHttp from 'pino-http';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import { apiLimiter } from './middleware/rate-limit.js';
import { notFoundHandler, errorHandler } from './middleware/error-handler.js';
import { authRouter } from './routes/auth.routes.js';
import { capturesRouter } from './routes/captures.routes.js';
import { sourcesRouter } from './routes/sources.routes.js';
import { ingestRouter } from './routes/ingest.routes.js';
import { tasksRouter } from './routes/tasks.routes.js';
import { reviewRouter } from './routes/review.routes.js';
import { pingDatabase } from './db/pool.js';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: env.CLIENT_ORIGIN,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '2mb' }));
  if (env.NODE_ENV !== 'test') {
    app.use(pinoHttp({ logger, autoLogging: false }));
  }
  app.use('/api', apiLimiter);

  app.get('/api/health', async (_req, res) => {
    const dbOk = await pingDatabase();
    res.json({ ok: true, service: 'kaamsetu-api', database: dbOk ? 'up' : 'down', mode: env.NODE_ENV });
  });

  app.use('/api/auth', authRouter);
  app.use('/api/captures', capturesRouter);
  app.use('/api/sources', sourcesRouter);
  app.use('/api/ingest', ingestRouter);
  app.use('/api/tasks', tasksRouter);
  app.use('/api/review', reviewRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
