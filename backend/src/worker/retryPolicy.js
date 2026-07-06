// exponential backoff: 2^attempt secs
function getBackoffMs(attemptCount) {
  const seconds = Math.min(Math.pow(2, attemptCount), 60);
  return seconds * 1000;
}

function hasExceededMaxAttempts(task) {
  return task.attempt_count >= task.max_attempts;
}

module.exports = { getBackoffMs, hasExceededMaxAttempts };