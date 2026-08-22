import pg from 'pg';
import { env } from '../config/env.js';

// Postgres Pool
const pgPool = new pg.Pool({
  connectionString: env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

pgPool.on('error', (err) => {
  // eslint-disable-next-line no-console
  console.error('Unexpected idle client error', err.message);
});

// Unified Pool Adapter (Now just a passthrough for Postgres)
export const pool = {
  async query<T>(sql: string, params: any[] = []): Promise<{ rows: T[] }> {
    return (await pgPool.query(sql, params)) as unknown as { rows: T[] };
  },
  async connect(): Promise<any> {
    return await pgPool.connect();
  }
};

export async function pingDatabase(): Promise<boolean> {
  try {
    await pool.query('SELECT 1');
    return true;
  } catch {
    return false;
  }
}
