// Simulates executing a task's "step". Day 2: just a fake HTTP-ish call.
// Later this reads task.payload to know what to actually do.
async function executeStep(task) {
  console.log(`[executor] running task ${task.id} (${task.type})`);

  // TEMP: randomly succeed/fail so we can test both paths
  const willFail = Math.random() < 0.4;

  await new Promise((r) => setTimeout(r, 500)); // fake latency

  if (willFail) {
    throw new Error('Simulated failure: downstream call timed out');
  }
  return { ok: true, result: `processed ${task.type}` };
}

module.exports = { executeStep };