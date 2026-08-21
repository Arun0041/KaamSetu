import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../lib/async-handler.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { pool } from '../db/pool.js';
import { NotFound } from '../lib/errors.js';
import type { Request } from 'express';

export const tasksRouter = Router();

tasksRouter.use(authenticate);

const updateSchema = z.object({
  status: z.enum(['open', 'assigned', 'done', 'paused']).optional(),
  assignee: z.string().nullable().optional(),
});

tasksRouter.get('/', asyncHandler(async (req: Request, res) => {
  const { rows } = await pool.query(
    `SELECT t.* FROM tasks t
     JOIN captures c ON c.id = t.capture_id
     WHERE c.user_id = $1
     ORDER BY t.created_at DESC`,
    [req.user!.id],
  );
  res.json({ tasks: rows });
}));

tasksRouter.patch('/:id', validate(updateSchema), asyncHandler(async (req: Request, res) => {
  const fields: string[] = [];
  const values: unknown[] = [];
  let idx = 1;
  for (const key of ['status', 'assignee'] as const) {
    if (req.body[key] !== undefined) {
      fields.push(`${key} = $${idx}`);
      values.push(req.body[key]);
      idx += 1;
    }
  }
  values.push(req.params.id, req.user!.id);
  const { rows } = await pool.query(
    `UPDATE tasks SET ${fields.join(', ')}, updated_at = NOW()
     FROM captures c
     WHERE tasks.id = $${idx} AND c.id = tasks.capture_id AND c.user_id = $${idx + 1}
     RETURNING tasks.*`,
    values,
  );
  if (rows.length === 0) throw NotFound('Task not found');
  res.json({ task: rows[0] });
}));
