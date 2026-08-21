import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../lib/async-handler.js';
import { registerUser, loginUser, refreshTokens, logoutUser } from '../services/auth.js';
import { authLimiter } from '../middleware/rate-limit.js';
import { authenticate } from '../middleware/auth.js';

export const authRouter = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(120),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

authRouter.post('/register', authLimiter, validate(registerSchema), asyncHandler(async (req, res) => {
  const result = await registerUser(req.body);
  res.status(201).json(result);
}));

authRouter.post('/login', authLimiter, validate(loginSchema), asyncHandler(async (req, res) => {
  const result = await loginUser(req.body);
  res.json(result);
}));

authRouter.post('/refresh', authLimiter, validate(refreshSchema), asyncHandler(async (req, res) => {
  const result = await refreshTokens(req.body.refreshToken);
  res.json(result);
}));

authRouter.post('/logout', authenticate, validate(refreshSchema), asyncHandler(async (req, res) => {
  await logoutUser(req.body.refreshToken);
  res.status(204).end();
}));

authRouter.get('/me', authenticate, (req, res) => {
  res.json({ user: req.user });
});
