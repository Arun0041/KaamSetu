import pino from 'pino';
import { env } from '../config/env.js';

export const logger = pino({
  level: env.NODE_ENV === 'test' ? 'silent' : 'info',
  transport:
    env.NODE_ENV === 'development'
      ? { target: 'pino/file', options: { destination: 1 } }
      : undefined,
  base: { service: 'kaamsetu-api' },
  redact: ['req.headers.authorization', 'req.body.password', 'password_hash'],
});
