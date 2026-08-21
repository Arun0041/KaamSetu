import bcrypt from 'bcryptjs';
import { pool } from '../db/pool.js';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  hashToken,
} from '../lib/jwt.js';
import { Conflict, Unauthorized } from '../lib/errors.js';
import { env } from '../config/env.js';
import type { PublicUser, Role, User } from '../types/index.js';

interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  role: Role;
  created_at: string;
  updated_at: string;
}

interface RefreshRow {
  token_hash: string;
  expires_at: string;
  revoked_at: string | null;
}

const toPublic = (row: UserRow): PublicUser => ({
  id: row.id,
  email: row.email,
  name: row.name,
  role: row.role,
  created_at: row.created_at,
  updated_at: row.updated_at,
});

export async function registerUser(input: {
  email: string;
  password: string;
  name: string;
}): Promise<{ user: PublicUser; accessToken: string; refreshToken: string }> {
  const existing = await pool.query('SELECT id FROM users WHERE email = $1', [input.email]);
  if (existing.rowCount) throw Conflict('Email is already registered');

  const passwordHash = await bcrypt.hash(input.password, 10);
  const role: Role = 'member';
  const { rows } = await pool.query<UserRow>(
    `INSERT INTO users (email, password_hash, name, role) VALUES ($1, $2, $3, $4) RETURNING *`,
    [input.email, passwordHash, input.name, role],
  );
  const user = rows[0];
  const { accessToken, refreshToken } = await issueTokens(user);
  return { user: toPublic(user), accessToken, refreshToken };
}

export async function loginUser(input: { email: string; password: string }): Promise<{
  user: PublicUser;
  accessToken: string;
  refreshToken: string;
}> {
  const { rows } = await pool.query<UserRow>('SELECT * FROM users WHERE email = $1', [input.email]);
  const user = rows[0];
  if (!user) throw Unauthorized('Invalid email or password');
  const ok = await bcrypt.compare(input.password, user.password_hash);
  if (!ok) throw Unauthorized('Invalid email or password');
  const { accessToken, refreshToken } = await issueTokens(user);
  return { user: toPublic(user), accessToken, refreshToken };
}

export async function refreshTokens(refreshToken: string): Promise<{
  accessToken: string;
  refreshToken: string;
}> {
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw Unauthorized('Invalid refresh token');
  }
  const tokenHash = hashToken(refreshToken);
  const { rows } = await pool.query<RefreshRow>(
    'SELECT * FROM refresh_tokens WHERE token_hash = $1 AND revoked_at IS NULL',
    [tokenHash],
  );
  const record = rows[0];
  if (!record) throw Unauthorized('Refresh token revoked');
  if (new Date(record.expires_at).getTime() < Date.now()) throw Unauthorized('Refresh token expired');

  const { rows: userRows } = await pool.query<UserRow>('SELECT * FROM users WHERE id = $1', [
    payload.sub,
  ]);
  const user = userRows[0];
  if (!user) throw Unauthorized('User no longer exists');

  await pool.query('UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = $1', [tokenHash]);
  const tokens = await issueTokens(user);
  return tokens;
}

export async function logoutUser(refreshToken: string): Promise<void> {
  const tokenHash = hashToken(refreshToken);
  await pool.query('UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = $1', [tokenHash]);
}

async function issueTokens(user: UserRow): Promise<{ accessToken: string; refreshToken: string }> {
  const accessToken = signAccessToken({
    sub: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
  });
  const { token } = signRefreshToken(user.id);
  const expiresAt = new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
  await pool.query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
    [user.id, hashToken(token), expiresAt.toISOString()],
  );
  return { accessToken, refreshToken: token };
}

export async function upsertSource(input: {
  title: string;
  content: string;
  source_type: string;
  page?: string | null;
}): Promise<void> {
  await pool.query(
    `INSERT INTO sources (title, content, source_type, page) VALUES ($1, $2, $3, $4)`,
    [input.title, input.content, input.source_type, input.page ?? null],
  );
}
