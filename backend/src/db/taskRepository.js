const { pool } = require('./index');

async function createTask({ agentId, type, payload, idempotencyKey }) {
  const result = await pool.query(
    `INSERT INTO tasks (agent_id, type, payload, idempotency_key)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (idempotency_key) DO NOTHING
     RETURNING *`,
    [agentId, type, payload, idempotencyKey]
  );
  return result.rows[0]; // undefined if it was a duplicate
}

async function getTask(taskId) {
  const result = await pool.query(`SELECT * FROM tasks WHERE id = $1`, [taskId]);
  return result.rows[0];
}

async function updateStatus(taskId, status, extra = {}) {
  const result = await pool.query(
    `UPDATE tasks SET status = $2, updated_at = now() WHERE id = $1 RETURNING *`,
    [taskId, status]
  );
  return result.rows[0];
}

async function incrementAttempt(taskId) {
  const result = await pool.query(
    `UPDATE tasks SET attempt_count = attempt_count + 1, updated_at = now()
     WHERE id = $1 RETURNING *`,
    [taskId]
  );
  return result.rows[0];
}

async function logHistory(taskId, event, detail = {}) {
  await pool.query(
    `INSERT INTO task_history (task_id, event, detail) VALUES ($1, $2, $3)`,
    [taskId, event, detail]
  );
}
async function markDeadLetter(taskId) {
  const result = await pool.query(
    `UPDATE tasks SET status = 'dead_letter', updated_at = now() WHERE id = $1 RETURNING *`,
    [taskId]
  );
  return result.rows[0];
}

async function markSkipped(taskId) {
  const result = await pool.query(
    `UPDATE tasks SET status = 'skipped', updated_at = now() WHERE id = $1 RETURNING *`,
    [taskId]
  );
  return result.rows[0];
}

async function getAgentByApiKey(apiKey) {
  const result = await pool.query(`SELECT * FROM agents WHERE api_key = $1`, [apiKey]);
  return result.rows[0];
}

async function listFailedTasks(agentId, limit = 20) {
  const result = await pool.query(
    `SELECT * FROM tasks 
     WHERE agent_id = $1 AND status IN ('failed', 'retrying', 'escalated', 'dead_letter')
     ORDER BY updated_at DESC LIMIT $2`,
    [agentId, limit]
  );
  return result.rows;
}

async function getTaskHistory(taskId) {
  const result = await pool.query(
    `SELECT event, detail, created_at FROM task_history WHERE task_id = $1 ORDER BY created_at`,
    [taskId]
  );
  return result.rows;
}

async function resetForRetry(taskId) {
  const result = await pool.query(
    `UPDATE tasks SET status = 'pending', attempt_count = 0, updated_at = now() WHERE id = $1 RETURNING *`,
    [taskId]
  );
  return result.rows[0];
}

module.exports = { 
  createTask, getTask, updateStatus, incrementAttempt, logHistory, 
  markDeadLetter, markSkipped, getAgentByApiKey, listFailedTasks, 
  getTaskHistory, resetForRetry 
};