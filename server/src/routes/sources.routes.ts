import { Router } from 'express';
import { asyncHandler } from '../lib/async-handler.js';
import { authenticate } from '../middleware/auth.js';
import { pool } from '../db/pool.js';

export const sourcesRouter = Router();

sourcesRouter.use(authenticate);

sourcesRouter.get('/', asyncHandler(async (_req, res) => {
  const { rows } = await pool.query(
    'SELECT id, title, source_type, page, created_at FROM sources ORDER BY created_at DESC',
  );
  res.json({ sources: rows });
}));

sourcesRouter.get('/:id', asyncHandler(async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM sources WHERE id = $1', [req.params.id]);
  if (rows.length === 0) {
    res.status(404).json({ error: 'Source not found', code: 'NOT_FOUND' });
    return;
  }
  res.json({ source: rows[0] });
}));
