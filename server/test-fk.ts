import { pool } from './src/db/pool.js';
async function test() {
  try {
    const { rows: users } = await pool.query('SELECT * FROM users LIMIT 1');
    const user = users[0];
    if (!user) return console.log('no user found');
    console.log('User:', user.id);
    const { rows: captures } = await pool.query("INSERT INTO captures (user_id, status) VALUES ($1, 'pending') RETURNING *", [user.id]);
    const capture = captures[0];
    console.log('Capture:', capture.id);
    const { rows: tasks1 } = await pool.query("INSERT INTO tasks (capture_id, title, status) VALUES ($1, 't1', 'open') RETURNING *", [capture.id]);
    const task1 = tasks1[0];
    console.log('Task 1:', task1.id);
    const { rows: tasks2 } = await pool.query("INSERT INTO tasks (capture_id, title, status, depends_on) VALUES ($1, 't2', 'blocked', $2) RETURNING *", [capture.id, task1.id]);
    const task2 = tasks2[0];
    console.log('Task 2:', task2.id);
  } catch (err) {
    console.error(err);
  }
}
test();
