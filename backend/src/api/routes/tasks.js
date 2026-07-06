const express = require('express');
const router = express.Router();
const { createTask, getTask, getTaskHistory, listAllTasks, resetForRetry } = require('../../db/taskRepository');
const { enqueueTask } = require('../../queue/redisStreams');
const { v4: uuidv4 } = require('uuid');

router.post('/', async (req, res) => {
  const { type, payload } = req.body;
  if (!type || !payload) return res.status(400).json({ error: 'type and payload required' });

  const task = await createTask({
    agentId: req.agent.id,
    type,
    payload,
    idempotencyKey: uuidv4(),
  });
  if (!task) return res.status(409).json({ error: 'Duplicate task' });

  await enqueueTask(task.id);
  res.status(201).json(task);
});

router.get('/:id', async (req, res) => {
  const task = await getTask(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  const history = await getTaskHistory(req.params.id);
  res.json({ task, history });
});

router.get('/', async (req, res) => {
  const tasks = await listAllTasks(req.agent.id, req.query.limit || 20);
  res.json(tasks);
});

router.post('/:id/retry', async (req, res) => {
  const task = await resetForRetry(req.params.id);
  await enqueueTask(task.id);
  res.json(task);
});

module.exports = router;