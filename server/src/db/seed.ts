import { pool } from './pool.js';
import { logger } from '../lib/logger.js';

export async function seedSourcesIfEmpty(): Promise<void> {
  const { rows } = await pool.query('SELECT COUNT(*)::int AS count FROM sources');
  if ((rows[0]?.count ?? 0) > 0) return;

  const sources = [
    {
      title: 'Finance Policy v3',
      content:
        'Advance payment must not exceed 20% of the purchase order value. Any exception requires written approval from the owner.',
      source_type: 'pdf',
      page: '4',
    },
    {
      title: 'Sharma Steels Quotation',
      content:
        'For this order, an advance of 30% is requested to begin production. Payment terms: 30% advance, balance on delivery.',
      source_type: 'docx',
      page: '1',
    },
    {
      title: 'Courier Pickup Schedule',
      content:
        'Daily courier pickup is at 4:00 PM. Parcels must be ready and labelled before 3:30 PM for same-day dispatch.',
      source_type: 'docx',
      page: '1',
    },
  ];

  for (const source of sources) {
    await pool.query(
      `INSERT INTO sources (title, content, source_type, page) VALUES ($1, $2, $3, $4)`,
      [source.title, source.content, source.source_type, source.page],
    );
  }
  logger.info({ count: sources.length }, 'Seeded demo sources');
}
