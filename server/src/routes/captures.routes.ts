import { Router } from 'express';
import { asyncHandler } from '../lib/async-handler.js';
import { authenticate } from '../middleware/auth.js';
import {
  listCaptures,
  getCapture,
  listTasksForCapture,
  listReviewItemsForCapture,
} from '../services/capture-repo.js';
import { NotFound } from '../lib/errors.js';
import type { Request } from 'express';

export const capturesRouter = Router();

capturesRouter.use(authenticate);

capturesRouter.get('/', asyncHandler(async (req: Request, res) => {
  const captures = await listCaptures(req.user!.id);
  res.json({ captures });
}));

capturesRouter.get('/:id', asyncHandler(async (req: Request, res) => {
  const capture = await getCapture(req.params.id);
  if (!capture || capture.user_id !== req.user!.id) throw NotFound('Capture not found');
  const tasks = await listTasksForCapture(capture.id);
  const reviewItems = await listReviewItemsForCapture(capture.id);
  res.json({ capture, tasks, reviewItems });
}));
