import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { pool } from './pool.js';
import { logger } from '../lib/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.resolve(__dirname, '../../migrations');

const isSqlite = process.env.DATABASE_URL?.startsWith('sqlite:');

async function ensureMigrationsTable() {
  const sql = isSqlite 
    ? `
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id TEXT PRIMARY KEY,
        applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    ` 
    : `
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
    let sql = await readFile(path.join(migrationsDir, file), 'utf8');
    
    if (isSqlite) {
      // Clean up postgres specific syntax
      sql = sql.replace(/CREATE EXTENSION IF NOT EXISTS "pgcrypto";/gi, '');
      sql = sql.replace(/DEFAULT gen_random_uuid\(\)/gi, "DEFAULT (lower(hex(randomblob(16))))");
      sql = sql.replace(/TIMESTAMPTZ/gi, 'TEXT');
      sql = sql.replace(/DEFAULT NOW\(\)/gi, 'DEFAULT CURRENT_TIMESTAMP');
      sql = sql.replace(/::jsonb/gi, ''); // Do this BEFORE changing JSONB to TEXT
      sql = sql.replace(/JSONB/gi, 'TEXT');
      sql = sql.replace(/ALTER TABLE \w+ DROP CONSTRAINT \w+;/gi, '');
      sql = sql.replace(/ALTER TABLE \w+ ADD CONSTRAINT \w+ CHECK .+;/gi, '');
    }

    const optional = sql.includes('-- optional');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      if (isSqlite) {
        // SQLite doesn't support multiple statements per query natively in node-sqlite driver unless using exec.
        // Strip out all comments first, then split by semicolon
        const noComments = sql.replace(/--.*$/gm, '');
        const stmts = noComments.split(';').map(s => s.trim()).filter(s => s.length > 0);
        for (const stmt of stmts) {
          await client.query(stmt + ';');
        }
      } else {
        await client.query(sql);
      }
      
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
