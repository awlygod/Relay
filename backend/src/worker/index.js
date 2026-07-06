require('dotenv').config();
const { ensureGroup, readTasks, ackTask } = require('../queue/redisStreams');
const { getTask, updateStatus, incrementAttempt, logHistory, markDeadLetter } = require('../db/taskRepository');
const { executeStep } = require('./executor');
const { getBackoffMs, hasExceededMaxAttempts } = require('./retryPolicy');
const { enqueueTask } = require('../queue/redisStreams'); 
const { triageFailure } = require('../ai/triage');
const { markSkipped } = require('../db/taskRepository');

const CONSUMER_NAME = `worker-${process.pid}`;

async function processTask({ streamId, taskId }) {
  const task = await getTask(taskId);
  if (!task) {
    console.warn(`[worker] task ${taskId} not found, acking anyway`);
    await ackTask(streamId);
    return;
  }

  // idempotency guard
  if (['succeeded', 'dead_letter'].includes(task.status)) {
    console.log(`[worker] task ${task.id} already ${task.status}, skipping`);
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
  }  catch (err) {
    const updatedTask = await incrementAttempt(task.id);
    await logHistory(task.id, 'failed', { error: err.message, attempt: updatedTask.attempt_count });

    // ask Gemini what to do next
    const triage = await triageFailure(updatedTask, err.message);
    await logHistory(task.id, 'triaged', triage);
    console.log(`[triage] task ${task.id} → ${triage.decision}: ${triage.reasoning}`);

    if (triage.decision === 'skip') {
      await markSkipped(task.id);
      console.log(`[worker] task ${task.id} SKIPPED per triage decision`);
      await ackTask(streamId);
      return;
    }

    if (triage.decision === 'escalate') {
      await updateStatus(task.id, 'escalated');
      await logHistory(task.id, 'escalated', { reason: triage.reasoning });
      console.log(`[worker] task ${task.id} ESCALATED — needs human review`);
      await ackTask(streamId);
      return;
    }

    
    if (hasExceededMaxAttempts(updatedTask)) {
      await markDeadLetter(task.id);
      await logHistory(task.id, 'dead_letter', { reason: 'max attempts exceeded' });
      console.log(`[worker] task ${task.id} moved to DEAD LETTER after ${updatedTask.attempt_count} attempts`);
    } else {
      const backoffMs = getBackoffMs(updatedTask.attempt_count);
      await updateStatus(task.id, 'retrying');
      await logHistory(task.id, 'retry_scheduled', { backoffMs, nextAttempt: updatedTask.attempt_count + 1 });
      console.log(`[worker] task ${task.id} retrying in ${backoffMs}ms (attempt ${updatedTask.attempt_count})`);

      setTimeout(async () => {
        await enqueueTask(task.id);
      }, backoffMs);
    }
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