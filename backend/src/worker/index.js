require('dotenv').config();
const { ensureGroup, readTasks, ackTask } = require('../queue/redisStreams');
const { getTask, updateStatus, incrementAttempt, logHistory } = require('../db/taskRepository');
const { executeStep } = require('./executor');

const CONSUMER_NAME = `worker-${process.pid}`;

async function processTask({ streamId, taskId }) {
  const task = await getTask(taskId);
  if (!task) {
    console.warn(`[worker] task ${taskId} not found, acking anyway`);
    await ackTask(streamId);
    return;
  }

  await updateStatus(task.id, 'running');
  await logHistory(task.id, 'started');

  try {
    const result = await executeStep(task);
    await updateStatus(task.id, 'succeeded');
    await logHistory(task.id, 'succeeded', result);
    console.log(`[worker] task ${task.id} succeeded`);
  } catch (err) {
    await incrementAttempt(task.id);
    await updateStatus(task.id, 'failed');
    await logHistory(task.id, 'failed', { error: err.message });
    console.log(`[worker] task ${task.id} failed: ${err.message}`);
    // Day 3: retry/backoff/DLQ logic goes here
  }

  await ackTask(streamId);
}

async function runWorker() {
  await ensureGroup();
  console.log(`[worker] ${CONSUMER_NAME} started, waiting for tasks...`);

  while (true) {
    const tasks = await readTasks(CONSUMER_NAME);
    for (const t of tasks) {
      await processTask(t);
    }
  }
}

runWorker().catch((err) => {
  console.error('[worker] fatal error', err);
  process.exit(1);
});