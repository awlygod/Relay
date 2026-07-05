const { z } = require('zod');


const createTaskSchema = {
  name: 'create_task',
  description: 'Create and enqueue a new task for execution',
  inputSchema: {
    type: 'object',
    properties: {
      agentApiKey: { type: 'string', description: 'API key identifying the calling agent' },
      type: { type: 'string', description: 'Task type, e.g. send_webhook' },
      payload: { type: 'object', description: 'Arbitrary JSON payload for the task' },
    },
    required: ['agentApiKey', 'type', 'payload'],
  },
};

const getTaskStatusSchema = {
  name: 'get_task_status',
  description: 'Get the current status and history of a task by ID',
  inputSchema: {
    type: 'object',
    properties: {
      taskId: { type: 'string' },
    },
    required: ['taskId'],
  },
};

const listFailedTasksSchema = {
  name: 'list_failed_tasks',
  description: 'List tasks that are currently failed, retrying, escalated, or dead-lettered',
  inputSchema: {
    type: 'object',
    properties: {
      agentApiKey: { type: 'string' },
      limit: { type: 'number', default: 20 },
    },
    required: ['agentApiKey'],
  },
};

const retryTaskSchema = {
  name: 'retry_task',
  description: 'Manually force a retry of a dead-lettered or escalated task',
  inputSchema: {
    type: 'object',
    properties: {
      taskId: { type: 'string' },
    },
    required: ['taskId'],
  },
};

module.exports = { createTaskSchema, getTaskStatusSchema, listFailedTasksSchema, retryTaskSchema };