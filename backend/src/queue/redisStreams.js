const { redis } = require('./redisClient');

const STREAM_KEY = 'tasks:stream';
const GROUP_NAME = 'task-workers';

// Create the consumer group once 
async function ensureGroup() {
  try {
    await redis.xgroup('CREATE', STREAM_KEY, GROUP_NAME, '0', 'MKSTREAM');
    console.log(`[stream] consumer group "${GROUP_NAME}" created`);
  } catch (err) {
    if (err.message.includes('BUSYGROUP')) {
      console.log(`[stream] consumer group "${GROUP_NAME}" already exists`);
    } else {
      throw err;
    }
  }
}

// Push a task id onto the stream
async function enqueueTask(taskId) {
  const id = await redis.xadd(STREAM_KEY, '*', 'taskId', taskId);
  return id;
}

// Read pending entries for a given consumer
async function readTasks(consumerName, count = 5) {
  const res = await redis.xreadgroup(
    'GROUP', GROUP_NAME, consumerName,
    'COUNT', count,
    'BLOCK', 5000,
    'STREAMS', STREAM_KEY, '>'
  );
  if (!res) return [];

  const [, entries] = res[0];
  return entries.map(([id, fields]) => ({
    streamId: id,
    taskId: fields[1], // fields = ['taskId', '<value>']
  }));
}

// Acknowledge a processed entry
async function ackTask(streamId) {
  await redis.xack(STREAM_KEY, GROUP_NAME, streamId);
}

module.exports = { ensureGroup, enqueueTask, readTasks, ackTask, STREAM_KEY, GROUP_NAME };