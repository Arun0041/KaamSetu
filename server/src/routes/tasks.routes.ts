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

const resolveSchema = z.object({
  resolutionText: z.string().min(1)
});

// GET /api/tasks - Fetch tasks for the logged-in user
tasksRouter.get('/', asyncHandler(async (req: Request, res) => {
  const isOwner = req.user!.role === 'owner';
  const userName = req.user!.name;
  const firstName = userName.split(' ')[0];

  const { rows: tasks } = await pool.query(
    `SELECT t.*, c.transcript as capture_transcript, c.speaker_name as capture_speaker, 
            c.initials as capture_initials, c.user_id as capture_user_id
     FROM tasks t
     JOIN captures c ON c.id = t.capture_id
     WHERE t.status != 'done'
     ORDER BY t.created_at DESC`
  );

  const { rows: reviews } = await pool.query(
    `SELECT * FROM review_items WHERE status = 'open'`
  );

  // Filter: owner sees all, others see tasks assigned to them OR tasks they created
  const filteredTasks = tasks.filter((t: any) => {
    if (isOwner) return true;
    if (t.capture_user_id === req.user!.id) return true; // tasks I created
    const assignee = (t.assignee || '').toLowerCase();
    return assignee.includes(firstName.toLowerCase()) || assignee.includes(userName.toLowerCase());
  });

  const results = filteredTasks.map((t: any) => {
    const review = reviews.find((r: any) => {
      if (r.capture_id !== t.capture_id) return false;
      try {
        const meta = typeof r.metadata === 'string' ? JSON.parse(r.metadata) : r.metadata;
        return meta.task_index === t.step_index;
      } catch { return false; }
    }) as any;
    
    return {
      ...t,
      speaker: t.capture_speaker || 'Unknown',
      initials: t.capture_initials || 'UN',
      transcript: t.capture_transcript || '',
      reviewReason: review ? review.reason : null,
      needsReview: !!review
    };
  });

  res.json({ tasks: results });
}));

// GET /api/tasks/completed - Get completed tasks for current user
tasksRouter.get('/completed', asyncHandler(async (req: Request, res) => {
  const isOwner = req.user!.role === 'owner';
  const userName = req.user!.name;
  const firstName = userName.split(' ')[0];

  const { rows: tasks } = await pool.query(
    `SELECT t.*, c.transcript as capture_transcript, c.speaker_name as capture_speaker, 
            c.initials as capture_initials, c.user_id as capture_user_id
     FROM tasks t
     JOIN captures c ON c.id = t.capture_id
     WHERE t.status = 'done'
     ORDER BY t.updated_at DESC`
  );

  const filteredTasks = tasks.filter((t: any) => {
    if (isOwner) return true;
    if (t.capture_user_id === req.user!.id) return true;
    const assignee = (t.assignee || '').toLowerCase();
    return assignee.includes(firstName.toLowerCase()) || assignee.includes(userName.toLowerCase());
  });

  res.json({ tasks: filteredTasks });
}));

// GET /api/tasks/workflow/:captureId - Get full chain for a capture
tasksRouter.get('/workflow/:captureId', asyncHandler(async (req: Request, res) => {
  const { rows: tasks } = await pool.query(
    `SELECT t.*, c.transcript as capture_transcript, c.speaker_name as capture_speaker
     FROM tasks t
     JOIN captures c ON c.id = t.capture_id
     WHERE t.capture_id = $1
     ORDER BY t.step_index ASC`,
    [req.params.captureId]
  );
  res.json({ tasks });
}));

// PATCH /api/tasks/:id - Update task status/assignee (owner only, or the creator)
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
  if (fields.length === 0) throw NotFound('Nothing to update');
  values.push(req.params.id);
  // Allow update if user is owner OR is the creator of the capture
  const { rows } = await pool.query(
    `UPDATE tasks SET ${fields.join(', ')}, updated_at = NOW()
     WHERE tasks.id = $${idx}
     RETURNING tasks.*`,
    values,
  );
  if (rows.length === 0) throw NotFound('Task not found');
  res.json({ task: rows[0] });
}));

// POST /api/tasks/:id/resolve - Complete a task and unblock dependents
tasksRouter.post('/:id/resolve', validate(resolveSchema), asyncHandler(async (req: Request, res) => {
  const taskId = req.params.id;
  const { resolutionText } = req.body;

  // Mark the task as done - ANY authenticated user can resolve (the assignee)
  const { rows: taskRows } = await pool.query(
    `UPDATE tasks SET status = 'done', prior_context = $1, updated_at = NOW()
     WHERE id = $2
     RETURNING *`,
    [resolutionText, taskId]
  );
  
  if (taskRows.length === 0) throw NotFound('Task not found');
  const task = taskRows[0] as any;

  // Unblock dependent tasks and pass context forward
  const { rows: depRows } = await pool.query(
    `UPDATE tasks SET 
      status = 'assigned', 
      prior_context = $1,
      updated_at = NOW()
     WHERE depends_on = $2 AND status = 'blocked'
     RETURNING *`,
    [`Data from previous step: ${resolutionText}`, taskId]
  );

  // Also resolve any open review items for this capture
  await pool.query(
    `UPDATE review_items SET status = 'resolved', updated_at = NOW()
     WHERE capture_id = $1 AND status = 'open'`,
    [task.capture_id]
  );

  res.json({ task, unblocked_tasks: depRows });
}));
