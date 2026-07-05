require('dotenv').config();
const { pool } = require('../db');
const { createTask } = require('../db/taskRepository');
const { enqueueTask } = require('../queue/redisStreams');
const { v4: uuidv4 } = require('uuid');

async function main() {
  // dummy agent if none exists
  const agentRes = await pool.query(
    `INSERT INTO agents (name, api_key) VALUES ('test-agent', 'test-key-123')
     ON CONFLICT (api_key) DO UPDATE SET name = EXCLUDED.name
     RETURNING *`
  );
  const agent = agentRes.rows[0];

  const task = await createTask({
    agentId: agent.id,
    type: 'send_webhook',
    payload: { url: 'https://example.com' },
    idempotencyKey: uuidv4(),
  });

  await enqueueTask(task.id);
  console.log('Enqueued task:', task.id);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});