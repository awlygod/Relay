require('dotenv').config();
const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { CallToolRequestSchema, ListToolsRequestSchema } = require('@modelcontextprotocol/sdk/types.js');

const { createTaskSchema, getTaskStatusSchema, listFailedTasksSchema, retryTaskSchema } = require('./tools');
const {
  createTask, getTask, getAgentByApiKey, listFailedTasks, getTaskHistory, resetForRetry,
} = require('../db/taskRepository');
const { enqueueTask } = require('../queue/redisStreams');
const { v4: uuidv4 } = require('uuid');

const server = new Server(
  { name: 'relay-mcp', version: '0.1.0' },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [createTaskSchema, getTaskStatusSchema, listFailedTasksSchema, retryTaskSchema],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    if (name === 'create_task') {
      const agent = await getAgentByApiKey(args.agentApiKey);
      if (!agent) throw new Error('Invalid agent API key');

      const task = await createTask({
        agentId: agent.id,
        type: args.type,
        payload: args.payload,
        idempotencyKey: uuidv4(),
      });
      if (!task) throw new Error('Duplicate task (idempotency conflict)');

      await enqueueTask(task.id);
      return { content: [{ type: 'text', text: JSON.stringify({ taskId: task.id, status: task.status }) }] };
    }

    if (name === 'get_task_status') {
      const task = await getTask(args.taskId);
      if (!task) throw new Error('Task not found');
      const history = await getTaskHistory(args.taskId);
      return { content: [{ type: 'text', text: JSON.stringify({ task, history }) }] };
    }

    if (name === 'list_failed_tasks') {
      const agent = await getAgentByApiKey(args.agentApiKey);
      if (!agent) throw new Error('Invalid agent API key');
      const tasks = await listFailedTasks(agent.id, args.limit || 20);
      return { content: [{ type: 'text', text: JSON.stringify(tasks) }] };
    }

    if (name === 'retry_task') {
      const task = await resetForRetry(args.taskId);
      await enqueueTask(task.id);
      return { content: [{ type: 'text', text: JSON.stringify({ taskId: task.id, status: task.status }) }] };
    }

    throw new Error(`Unknown tool: ${name}`);
  } catch (err) {
    return { content: [{ type: 'text', text: `Error: ${err.message}` }], isError: true };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[mcp] Relay MCP server running on stdio');
}

main().catch((err) => {
  console.error('[mcp] fatal error', err);
  process.exit(1);
});