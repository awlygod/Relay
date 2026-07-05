require('dotenv').config();
const { pool } = require('./db');
const { redis } = require('./queue/redisClient');

async function main() {
  const dbResult = await pool.query('SELECT NOW()');
  console.log('[postgres] connected:', dbResult.rows[0].now);

  await redis.set('healthcheck', 'ok');
  const val = await redis.get('healthcheck');
  console.log('[redis] healthcheck:', val);

  console.log('Day 1 setup verified');
  process.exit(0);
}

main().catch((err) => {
  console.error('Startup check failed:', err);
  process.exit(1);
});