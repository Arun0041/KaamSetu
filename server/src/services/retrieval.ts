import { pool } from '../db/pool.js';

export interface RetrievedSource {
  id: string;
  title: string;
  content: string;
  source_type: string;
  page: string | null;
  score: number;
}

interface SourceRow {
  id: string;
  title: string;
  content: string;
  source_type: string;
  page: string | null;
  score?: number;
}

export async function retrieveSources(query: string, limit = 5): Promise<RetrievedSource[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const seen = new Set<string>();
  const terms: string[] = [];
  for (const raw of trimmed.split(/\s+/)) {
    const term = raw.replace(/[^a-zA-Z0-9%]+/g, '');
    if (!term || term.length < 3) continue;
    const key = term.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    terms.push(term);
    if (terms.length >= 15) break;
  }
  if (terms.length === 0) return [];

  const columns = ['title', 'content'];
  const whereClauses = terms.map((_, i) => {
    return columns.map((c) => `LOWER(${c}) LIKE LOWER($${i + 1})`).join(' OR ');
  });
  const values = terms.map((term) => `%${term}%`);
  const sql = `
    SELECT id, title, content, source_type, page
    FROM sources
    WHERE ${whereClauses.join(' OR ')}
    ORDER BY created_at DESC
    LIMIT $${terms.length + 1}
  `;
  values.push(String(limit));

  const { rows } = await pool.query<SourceRow>(sql, values);
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    content: row.content,
    source_type: row.source_type,
    page: row.page,
    score: 1,
  }));
}
