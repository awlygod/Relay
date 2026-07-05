require('dotenv').config();
const { pool } = require('../db');

async function main() {
  const taskId = process.argv[2]; // pass task id as arg, or leave blank for all
  const query = taskId
    ? `SELECT event, detail, created_at FROM task_history WHERE task_id = $1 ORDER BY created_at`
    : `SELECT t.type, th.event, th.detail, th.created_at 
       FROM task_history th JOIN tasks t ON t.id = th.task_id 
       ORDER BY th.created_at DESC LIMIT 20`;
  const params = taskId ? [taskId] : [];

  const result = await pool.query(query, params);
  console.table(result.rows);
  process.exit(0);
}

main().catch((err) => { console.error(err); process.exit(1); });