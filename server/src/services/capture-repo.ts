import { pool } from '../db/pool.js';
import type {
  Capture,
  CaptureStatus,
  ReviewItem,
  Task,
  TaskPriority,
  TaskStatus,
} from '../types/index.js';

interface CaptureRow {
  id: string;
  user_id: string;
  speaker_name: string | null;
  initials: string | null;
  transcript: string | null;
  audio_path: string | null;
  status: CaptureStatus;
  confidence: number | null;
  error: string | null;
  created_at: string;
  updated_at: string;
}

interface TaskRow {
  id: string;
  capture_id: string;
  title: string;
  assignee: string | null;
  deadline: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  confidence: number | null;
  created_at: string;
  updated_at: string;
}

interface ReviewRow {
  id: string;
  capture_id: string;
  type: ReviewItem['type'];
  reason: string | null;
  status: 'open' | 'resolved';
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

const mapCapture = (row: CaptureRow): Capture => row;

export async function createCapture(userId: string, audioPath: string | null): Promise<Capture> {
  const { rows } = await pool.query<CaptureRow>(
    `INSERT INTO captures (user_id, audio_path, status) VALUES ($1, $2, 'pending') RETURNING *`,
    [userId, audioPath],
  );
  return mapCapture(rows[0]);
}

export async function updateCapture(
  id: string,
  patch: Partial<
    Pick<Capture, 'speaker_name' | 'initials' | 'transcript' | 'status' | 'confidence' | 'error'>
  >,
): Promise<Capture | null> {
  const fields: string[] = [];
  const values: unknown[] = [];
  let idx = 1;
  for (const key of ['speaker_name', 'initials', 'transcript', 'status', 'confidence', 'error'] as const) {
    if (patch[key] !== undefined) {
      fields.push(`${key} = $${idx}`);
      values.push(patch[key]);
      idx += 1;
    }
  }
  if (fields.length === 0) {
    const { rows } = await pool.query<CaptureRow>('SELECT * FROM captures WHERE id = $1', [id]);
    return rows[0] ? mapCapture(rows[0]) : null;
  }
  values.push(id);
  const { rows } = await pool.query<CaptureRow>(
    `UPDATE captures SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${idx} RETURNING *`,
    values,
  );
  return rows[0] ? mapCapture(rows[0]) : null;
}

export async function getCapture(id: string): Promise<Capture | null> {
  const { rows } = await pool.query<CaptureRow>('SELECT * FROM captures WHERE id = $1', [id]);
  return rows[0] ? mapCapture(rows[0]) : null;
}

export async function listCaptures(userId: string): Promise<Capture[]> {
  const { rows } = await pool.query<CaptureRow>(
    'SELECT * FROM captures WHERE user_id = $1 ORDER BY created_at DESC',
    [userId],
  );
  return rows.map(mapCapture);
}

export async function createTask(input: {
  captureId: string;
  title: string;
  assignee: string | null;
  deadline: string | null;
  priority: TaskPriority;
  confidence: number | null;
}): Promise<Task> {
  const { rows } = await pool.query<TaskRow>(
    `INSERT INTO tasks (capture_id, title, assignee, deadline, priority, confidence)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [input.captureId, input.title, input.assignee, input.deadline, input.priority, input.confidence],
  );
  return rows[0];
}

export async function listTasksForCapture(captureId: string): Promise<Task[]> {
  const { rows } = await pool.query<TaskRow>(
    'SELECT * FROM tasks WHERE capture_id = $1 ORDER BY created_at DESC',
    [captureId],
  );
  return rows;
}

export async function updateTaskStatus(
  id: string,
  status: TaskStatus,
): Promise<Task | null> {
  const { rows } = await pool.query<TaskRow>(
    'UPDATE tasks SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
    [status, id],
  );
  return rows[0] ?? null;
}

export async function createReviewItem(input: {
  captureId: string;
  type: ReviewItem['type'];
  reason: string | null;
  metadata?: Record<string, unknown>;
}): Promise<ReviewItem> {
  const { rows } = await pool.query<ReviewRow>(
    `INSERT INTO review_items (capture_id, type, reason, metadata)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [input.captureId, input.type, input.reason, input.metadata ?? {}],
  );
  return rows[0];
}

export async function listReviewItems(userId: string): Promise<ReviewItem[]> {
  const { rows } = await pool.query<ReviewRow>(
    `SELECT r.* FROM review_items r
     JOIN captures c ON c.id = r.capture_id
     WHERE c.user_id = $1 AND r.status = 'open'
     ORDER BY r.created_at DESC`,
    [userId],
  );
  return rows;
}

export async function listReviewItemsForCapture(captureId: string): Promise<ReviewItem[]> {
  const { rows } = await pool.query<ReviewRow>(
    'SELECT * FROM review_items WHERE capture_id = $1 ORDER BY created_at DESC',
    [captureId],
  );
  return rows;
}

export async function resolveReviewItem(id: string, userId: string): Promise<ReviewItem | null> {
  const { rows } = await pool.query<ReviewRow>(
    `UPDATE review_items r SET status = 'resolved', updated_at = NOW()
     FROM captures c
     WHERE r.id = $1 AND c.id = r.capture_id AND c.user_id = $2
     RETURNING r.*`,
    [id, userId],
  );
  return rows[0] ?? null;
}
