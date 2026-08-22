import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { MulterError } from 'multer';
import { AppError, PayloadTooLarge, TooManyRequests } from '../lib/errors.js';
import { logger } from '../lib/logger.js';
import { env } from '../config/env.js';

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ error: 'Not found', code: 'NOT_FOUND' });
}

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: err.message,
      code: err.code,
      ...(err.details !== undefined ? { details: err.details } : {}),
    });
    return;
  }

  if (err instanceof MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      res.status(PayloadTooLarge().statusCode).json({
        error: `File too large. Maximum size is ${env.AUDIO_MAX_MB}MB`,
        code: 'PAYLOAD_TOO_LARGE',
      });
      return;
    }
    res.status(400).json({ error: err.message, code: 'UPLOAD_ERROR' });
    return;
  }

  if (err instanceof ZodError) {
    const details = err.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    }));
    res.status(400).json({ error: 'Validation failed', code: 'VALIDATION_ERROR', details });
    return;
  }

  // PostgreSQL/connection failures should not be reported as an opaque 500.
  // This also covers the common local-dev cases where Postgres is stopped,
  // the database has not been created yet, or DATABASE_URL has bad credentials.
  if (isDatabaseError(err)) {
    logger.error({ err, path: req.path, method: req.method }, 'Database unavailable');
    res.status(503).json({
      error: 'Database unavailable. Check PostgreSQL and DATABASE_URL.',
      code: 'DATABASE_UNAVAILABLE',
    });
    return;
  }

  logger.error({ err, path: req.path, method: req.method }, 'Unhandled error');
  res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR' });
}

function isDatabaseError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const candidate = err as { code?: string; message?: string };
  return [
    'ECONNREFUSED',
    'ECONNRESET',
    'ETIMEDOUT',
    '28P01', // invalid_password
    '3D000', // invalid_catalog_name
    '57P03', // cannot_connect_now
  ].includes(candidate.code ?? '') || /connect|database|password authentication/i.test(candidate.message ?? '');
}
