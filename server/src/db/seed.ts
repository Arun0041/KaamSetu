import bcrypt from 'bcryptjs';
import { pool } from './pool.js';
import { logger } from '../lib/logger.js';

export async function seedSourcesIfEmpty(): Promise<void> {
  const { rows } = await pool.query<{ count: number | string }>('SELECT COUNT(*) AS count FROM sources');
  if (Number(rows[0]?.count ?? 0) > 0) return;

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

export async function seedUsersIfEmpty(): Promise<void> {
  const { rows } = await pool.query<{ count: number | string }>('SELECT COUNT(*) AS count FROM users');
  if (Number(rows[0]?.count ?? 0) > 0) return;

  const users = [
    { email: 'anika@kaamsetu.in', name: 'Anika Kapoor', role: 'owner' },
    { email: 'ravi@kaamsetu.in', name: 'Ravi Mehta', role: 'owner' },
    { email: 'ravi.k@kaamsetu.in', name: 'Ravi Kumar', role: 'member' },
    { email: 'rahul@kaamsetu.in', name: 'Rahul Sharma', role: 'member' },
    { email: 'mohan@kaamsetu.in', name: 'Mohan Verma', role: 'member' },
    { email: 'priya@kaamsetu.in', name: 'Priya Shah', role: 'member' }
  ];

  const hash = await bcrypt.hash('demo-password-123', 10);
  
  for (const u of users) {
    await pool.query(
      `INSERT INTO users (email, password_hash, name, role) VALUES ($1, $2, $3, $4)`,
      [u.email, hash, u.name, u.role]
    );
  }
  logger.info('Seeded demo users');
}
