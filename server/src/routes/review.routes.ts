import { Router } from 'express';
import { asyncHandler } from '../lib/async-handler.js';
import { authenticate } from '../middleware/auth.js';
import { listReviewItems, resolveReviewItem } from '../services/capture-repo.js';
import { NotFound } from '../lib/errors.js';
import type { Request } from 'express';

export const reviewRouter = Router();

reviewRouter.use(authenticate);

reviewRouter.get('/', asyncHandler(async (req: Request, res) => {
  const items = await listReviewItems(req.user!.id);
  res.json({ reviewItems: items });
}));

reviewRouter.post('/:id/resolve', asyncHandler(async (req: Request, res) => {
  const item = await resolveReviewItem(req.params.id, req.user!.id);
  if (!item) throw NotFound('Review item not found');
  res.json({ reviewItem: item });
}));
