const { spawn } = require('child_process');

const server = spawn('node', ['src/mcp/server.js'], { cwd: __dirname + '/../..' });

server.stderr.on('data', (d) => console.log('[server log]', d.toString()));
server.stdout.on('data', (d) => console.log('[server response]', d.toString()));

const listToolsRequest = {
  jsonrpc: '2.0',
  id: 1,
  method: 'tools/list',
  params: {},
};

const createTaskRequest = {
  jsonrpc: '2.0',
  id: 2,
  method: 'tools/call',
  params: {
    name: 'create_task',
    arguments: {
      agentApiKey: 'test-key-123', // the dummy agent from Day 2's createTestTask.js
      type: 'send_webhook',
      payload: { url: 'https://example.com' },
    },
  },
};

setTimeout(() => {
  server.stdin.write(JSON.stringify(listToolsRequest) + '\n');
}, 500);

setTimeout(() => {
  server.stdin.write(JSON.stringify(createTaskRequest) + '\n');
}, 1000);

setTimeout(() => server.kill(), 3000);