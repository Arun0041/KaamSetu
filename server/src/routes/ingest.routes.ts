import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { asyncHandler } from '../lib/async-handler.js';
import { authenticate } from '../middleware/auth.js';
import { runIngestPipeline } from '../services/pipeline.js';
import { ingestLimiter } from '../middleware/rate-limit.js';
import { validate } from '../middleware/validate.js';
import { env } from '../config/env.js';
import { BadRequest } from '../lib/errors.js';
import type { Request } from 'express';

export const ingestRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.AUDIO_MAX_MB * 1024 * 1024, files: 1 },
});

const textSchema = z.object({
  transcript: z.string().min(1).max(20000),
});

ingestRouter.use(authenticate);

ingestRouter.post(
  '/',
  ingestLimiter,
  upload.single('audio'),
  asyncHandler(async (req: Request, res) => {
    if (!req.file) throw BadRequest('Audio file is required (field name "audio")');
    if (!/^(audio|video|application\/octet-stream)\//.test(req.file.mimetype)) {
      throw BadRequest('Unsupported file type');
    }
    const result = await runIngestPipeline({
      userId: req.user!.id,
      buffer: req.file.buffer,
      filename: req.file.originalname,
      mimeType: req.file.mimetype,
    });
    res.status(202).json(result);
  }),
);

ingestRouter.post('/text', ingestLimiter, validate(textSchema), asyncHandler(async (req: Request, res) => {
  const result = await runIngestPipeline({
    userId: req.user!.id,
    transcript: req.body.transcript,
  });
  res.status(202).json(result);
}));
