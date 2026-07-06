
async function executeStep(task) {
  console.log(`[executor] running task ${task.id} (${task.type})`);
  await new Promise((r) => setTimeout(r, 500));

  const rand = Math.random();
  if (rand < 0.25) {
    throw new Error('Connection timeout while calling downstream service');
  } else if (rand < 0.4) {
    throw new Error('Invalid payload: missing required field "url"');
  } else if (rand < 0.5) {
    throw new Error('401 Unauthorized: invalid API credentials');
  }
  return { ok: true, result: `processed ${task.type}` };
}

module.exports = { executeStep };