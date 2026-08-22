import pg from 'pg';
import { env } from '../config/env.js';
import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';

const isSqlite = env.DATABASE_URL.startsWith('sqlite:');

// Postgres Pool
const pgPool = isSqlite ? null : new pg.Pool({
  connectionString: env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

if (pgPool) {
  pgPool.on('error', (err) => {
    // eslint-disable-next-line no-console
    console.error('Unexpected idle client error', err.message);
  });
}

// SQLite Database
let sqlitePromise: Promise<Database<sqlite3.Database, sqlite3.Statement>> | null = null;

if (isSqlite) {
  const filename = env.DATABASE_URL.replace('sqlite:', '');
  sqlitePromise = open({
    filename,
    driver: sqlite3.Database
  }).then(db => {
    // Enable foreign keys
    db.exec('PRAGMA foreign_keys = ON;');
    return db;
  }).catch(err => {
    console.error('Failed to open SQLite database:', err);
    throw err;
  });
}

// Unified Pool Adapter
export const pool = {
  async query<T>(sql: string, params: any[] = []): Promise<{ rows: T[] }> {
    if (isSqlite) {
      const sqliteDb = await sqlitePromise;
      if (!sqliteDb) throw new Error('SQLite database not initialized');
      
      // Translate Postgres variables ($1) to SQLite variables (?1)
      let sqliteSql = sql.replace(/\$(\d+)/g, '?$1');
      
      // Translate ILIKE to LIKE for basic search
      sqliteSql = sqliteSql.replace(/\bILIKE\b/g, 'LIKE');
      
      // Translate NOW() to CURRENT_TIMESTAMP if outside of default constraints (mostly for updates)
      sqliteSql = sqliteSql.replace(/\bNOW\(\)/g, 'CURRENT_TIMESTAMP');

      // Execute query
      if (sqliteSql.trim().toUpperCase().startsWith('SELECT') || sqliteSql.includes('RETURNING')) {
        const rows = await sqliteDb.all(sqliteSql, params);
        return { rows: rows as T[] };
      } else {
        const result = await sqliteDb.run(sqliteSql, params);
        return { rows: [] };
      }
    } else {
      return (await pgPool!.query(sql, params)) as unknown as { rows: T[] };
    }
  },
  async connect(): Promise<any> {
    if (isSqlite) {
      // Mock a client for transaction management
      return {
        query: this.query.bind(this),
        release: () => {},
      };
    } else {
      return await pgPool!.connect();
    }
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
