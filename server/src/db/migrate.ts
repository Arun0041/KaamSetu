import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { pool } from './pool.js';
import { logger } from '../lib/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.resolve(__dirname, '../../migrations');

async function ensureMigrationsTable() {
  const sql = `
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;
  await pool.query(sql);
}

export async function migrate(): Promise<void> {
  await ensureMigrationsTable();
  const files = (await readdir(migrationsDir))
    .filter((f) => f.endsWith('.sql'))
    .sort();

  const { rows } = await pool.query<{ id: string }>('SELECT id FROM schema_migrations');
  const applied = new Set(rows.map((r) => r.id));

  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = await readFile(path.join(migrationsDir, file), 'utf8');
    
    const optional = sql.includes('-- optional');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      await client.query(sql);
      
      await client.query('INSERT INTO schema_migrations (id) VALUES ($1)', [file]);
      await client.query('COMMIT');
      logger.info({ migration: file }, 'Migration applied');
    } catch (err) {
      await client.query('ROLLBACK');
      if (optional) {
        logger.warn({ migration: file, error: (err as Error).message }, 'Optional migration skipped');
        await client.query('INSERT INTO schema_migrations (id) VALUES ($1)', [file]);
      } else {
        logger.error({ migration: file, error: (err as Error).message }, 'Migration failed');
        throw err;
      }
    } finally {
      client.release();
    }
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  migrate()
    .then(() => {
      logger.info('Migrations complete');
      process.exit(0);
    })
    .catch((err) => {
      logger.error(err, 'Migration runner exited with error');
      process.exit(1);
    });
}
