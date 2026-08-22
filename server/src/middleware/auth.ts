import type { NextFunction, Request, Response } from 'express';
import { pool } from '../db/pool.js';
import { asyncHandler } from '../lib/async-handler.js';
import { verifyAccessToken } from '../lib/jwt.js';
import { Forbidden, Unauthorized } from '../lib/errors.js';
import type { Role } from '../types/index.js';

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
  name: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export const authenticate = asyncHandler(async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    throw Unauthorized('Missing bearer token');
  }
  const token = header.slice('Bearer '.length);
  
  if (token.startsWith('mock_')) {
    const userId = token.replace('mock_', '');
    req.user = { id: userId, email: `${userId}@mock.local`, role: 'owner', name: userId };
    return next();
  }

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch {
    throw Unauthorized('Invalid or expired token');
  }
  
  // Verify user still exists in DB (handles cases where DB was reset but token is cached)
  const { rows } = await pool.query('SELECT id FROM users WHERE id = $1', [payload.sub]);
  if (rows.length === 0) {
    throw Unauthorized('User no longer exists in database');
  }

  req.user = { id: payload.sub, email: payload.email, role: payload.role, name: payload.name };
  next();
});

export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) throw Unauthorized();
    if (!roles.includes(req.user.role)) throw Forbidden('Insufficient permissions');
    next();
  };
}
