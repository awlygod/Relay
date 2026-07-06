# Relay

Relay is a reliability layer for AI agent task execution. Basically, it gives AI agents a solid way to run multi step tasks (calling APIs, waiting on webhooks, retrying stuff that failed) instead of relying on cron jobs and hoping nothing breaks quietly in the background.

It's built with Node.js and Express for the backend, PostgreSQL to store task state, Redis Streams for the queue, the Gemini API for failure triage, React for the dashboard, and Docker to run everything in separate containers. It's also wrapped as an MCP server, so any AI agent or MCP compatible client can create and manage tasks directly.

# Why I Built This

AI agents increasingly need to run multi step tasks. Call this API, wait for that webhook, retry if something fails. But there isn't really lightweight, self hostable infrastructure made for this. Most people end up hacking together cron jobs and some retry logic that quietly breaks the moment something unexpected happens.

I wanted to build something small but real that agents could actually depend on. A task engine that retries smartly, knows when to give up, and can explain why it made each decision. Instead of retrying every failure in the exact same way, Relay uses an LLM to actually look at the error and decide whether to retry, skip it, or send it to a human. So it's less "dumb queue" and more "queue that can reason about its own failures."

This project also gave me hands on experience with distributed queues, failure recovery, MCP server design, and building infrastructure meant for other software to use, not just humans clicking around a UI.

# How It's Put Together

The app is split into five parts that talk to each other, mostly through a Docker network.

### API

Built with Express, runs on port 4000. Handles agent registration, task creation, and status checks. Every request needs an API key tied to a specific agent.

### Worker

A long running Node.js process that pulls tasks off Redis Streams, runs them, and figures out what happens next. Success, retry, or triage.

### MCP Server

A separate entry point exposes the same task engine as an MCP server over stdio. So something like Claude Desktop, or any other MCP client, can call create_task, get_task_status, list_failed_tasks, and retry_task directly, without touching the REST API at all.

### Database

Task state, attempt counts, and full event history all live in PostgreSQL on port 5432.

### Queue

Redis Streams on port 6379 holds the pending tasks. Consumer groups mean the worker picks things up reliably even if you scale up to multiple workers later.

### Dashboard

A React and Vite frontend that polls the API and shows live task status, retry counts, and the reasoning behind every triage decision.

The frontend never talks to the database or Redis directly. Everything goes through the API, which keeps things simpler to secure and easier to change later.

# Some Design Choices Worth Explaining

## Self healing triage instead of blindly retrying

Most retry systems just wait and try the exact same thing again. Relay instead sends the failure to an LLM along with context about the task and asks it what to do next.

* Retry for stuff that's probably temporary, like timeouts or rate limits
* Skip for failures that will never succeed no matter how many times you try, like bad input
* Escalate for anything that needs a human, like auth errors or something that just doesn't add up

This turns a mechanical queue into something that actually reasons about what went wrong instead of just repeating itself.

## Exponential backoff plus a dead letter queue

When a retry makes sense, Relay waits a bit longer each time (doubling up to a 60 second cap) instead of immediately trying again. If a task runs out of attempts, it gets moved to a dead letter state instead of retrying forever, and you can still see its whole history.

## Idempotency guards

Every task has an idempotency key, and the worker checks a task's current status before touching it. This stops a task from accidentally running twice if it gets re enqueued while it's still being acknowledged from an earlier read.

## MCP server as a real interface, not an afterthought

Instead of making the REST API the only way in, Relay exposes its core actions as MCP tools directly. That means an agent can create and check on its own tasks natively, no human needed to write glue code around a REST client.

## Plain SQL instead of an ORM

The task and worker logic needs pretty precise control over transactions and status changes. Plain SQL through the pg client keeps that explicit, and it avoids the extra layer an ORM adds for a project this size.

## One command to run the whole stack

Postgres, Redis, the API, and the worker all start together with a single Docker Compose command, so anyone can run it without doing manual setup.

# Tech Stack

| Component | Technology |
| ---------- | ---------- |
| Backend API | Node.js, Express |
| Worker | Node.js, Redis Streams |
| MCP Server | Model Context Protocol SDK |
| Triage | Gemini API |
| Database | PostgreSQL |
| Queue | Redis Streams |
| Frontend | React, Vite |
| Containerization | Docker, Docker Compose |

# Project Structure

```text
relay/
├── docker-compose.yml
├── README.md
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       ├── index.js
│       ├── api/
│       │   ├── routes/
│       │   │   ├── tasks.js
│       │   │   └── auth.js
│       │   └── middleware/
│       │       ├── apiKeyAuth.js
│       │       └── rateLimit.js
│       ├── worker/
│       │   ├── index.js
│       │   ├── executor.js
│       │   └── retryPolicy.js
│       ├── mcp/
│       │   ├── server.js
│       │   └── tools.js
│       ├── ai/
│       │   └── triage.js
│       ├── db/
│       │   ├── schema.sql
│       │   ├── index.js
│       │   └── taskRepository.js
│       └── queue/
│           ├── redisClient.js
│           └── redisStreams.js
└── frontend/
    ├── Dockerfile
    ├── package.json
    └── src/
        ├── api/
        │   └── client.js
        ├── components/
        │   ├── TaskList.jsx
        │   └── TaskDetail.jsx
        └── App.jsx
```

# Getting It Running

Make sure Docker Desktop is installed and running first.

```bash
git clone https://github.com/<your-username>/relay.git

cd relay
```

Add your Gemini API key to backend/.env:

```env
GEMINI_API_KEY=your_key_here
```

Start everything:

```bash
docker-compose up --build
```

Apply the schema once, after the containers are up:

```bash
cat backend/src/db/schema.sql | docker exec -i $(docker ps -qf "name=postgres") psql -U postgres -d agent_task_engine
```

The first time it starts, Docker will:

1. Start PostgreSQL
2. Start Redis
3. Build and start the Express API
4. Build and start the worker, which begins waiting for tasks

Once that's all running, register an agent, then start the dashboard:

```bash
cd frontend
npm install
npm run dev
```

Then open it in your browser:

http://localhost:5173

# Using It

Register an agent to get an API key:

```bash
curl -X POST http://localhost:4000/auth/register -H "Content-Type: application/json" -d '{"name":"demo-agent"}'
```

Create a task using that key:

```bash
curl -X POST http://localhost:4000/tasks -H "Content-Type: application/json" -H "X-API-Key: <your_key>" -d '{"type":"send_webhook","payload":{"url":"https://example.com"}}'
```

Open the dashboard and watch the task move through its lifecycle live. Pending, then running, then either succeeded, or failed followed by a triage decision (retry, skip, or escalate). Click on any task to see its full history, including the LLM's actual reasoning for each decision it made.

If you want to use Relay from an MCP client instead of the REST API, just point the client at backend/src/mcp/server.js and call create_task, get_task_status, list_failed_tasks, or retry_task directly.

# API Endpoints

| Method | Endpoint | Description |
| ------- | -------- | ----------- |
| POST | /auth/register | Register a new agent and get an API key |
| POST | /tasks | Create and enqueue a task (needs X-API-Key) |
| GET | /tasks | List tasks for the authenticated agent |
| GET | /tasks/:id | Get a task's current status and full history |
| POST | /tasks/:id/retry | Manually force a retry on a dead lettered or escalated task |
| GET | /health | Check whether the API is running |

# MCP Tools

| Tool | Description |
| ---- | ----------- |
| create_task | Create and enqueue a new task |
| get_task_status | Get the current status and history of a task by ID |
| list_failed_tasks | List tasks that are failed, retrying, escalated, or dead lettered |
| retry_task | Manually force a retry of a task |

# Features

1. Redis Streams based queue with consumer groups so tasks get picked up reliably
2. Automatic retry with exponential backoff
3. Dead letter queue for tasks that run out of attempts
4. LLM based triage that decides retry, skip, or escalate on every failure, with the reasoning saved to task history
5. Idempotency guards so tasks never accidentally run twice
6. Full event history for every task, so every decision is auditable
7. MCP server exposing the task engine directly to AI agents and MCP clients
8. Multi tenant API key authentication
9. Live React dashboard showing task status and triage reasoning in real time
10. Fully containerized with Docker Compose