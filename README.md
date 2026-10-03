# Joda Agent

A compact, self-hosted AI-agent starter: persistent chat, durable memory, safe built-in tools, and reminder scheduling. It is inspired by the *category* of personal agent systems, but does not copy another product's source code or branding.

## Features

- Dark-mode web chat UI, backed by Fastify.
- SQLite persistence for conversations, messages, memory notes, tasks, and task execution logs.
- Offline mock mode works with no credentials.
- Optional OpenAI-compatible chat-completions provider.
- Safe allowlisted tools only: `calculator` and `current_time`.
- Safe scheduler that records and completes reminder tasks; it **cannot** execute commands.
- Health, memory, task, and chat APIs.

## Architecture

```text
Browser UI → Fastify API → Agent orchestration → Mock or OpenAI-compatible LLM
                          ↘ SQLite store
                          ↘ Safe tool registry / reminder polling
```

The browser never receives the LLM API key. The agent loop is deliberately minimal and capped to built-in, validated capabilities; this MVP does not provide arbitrary shell access, filesystem writes, browser automation, or unrestricted outbound tools.

## Run locally

Prerequisites: Node.js 22+ and npm.

```bash
cp .env.example .env
npm install
npm run dev
```

Visit `http://localhost:3000`. Without `LLM_BASE_URL` and `LLM_API_KEY`, the app is explicitly in **offline mock mode**.

### Environment variables

| Variable | Purpose |
| --- | --- |
| `PORT` | HTTP port; defaults to `3000`. |
| `DATABASE_PATH` | SQLite file path. |
| `CORS_ORIGIN` | One or more comma-separated allowed browser origins. |
| `LLM_BASE_URL` | Base URL for an OpenAI-compatible API (without `/chat/completions`). |
| `LLM_API_KEY` | Server-side provider secret. |
| `LLM_MODEL` | Provider model name. |

## Quality checks

```bash
npm test
npm run build
npm start
```

Tests cover calculator behavior, allowlist enforcement, unsafe input rejection, and the health route.

## Docker

```bash
cp .env.example .env
docker compose up --build
```

SQLite data lives in the `joda-data` Docker volume.

## API overview

- `GET /api/health`
- `POST /api/chat` — `{ "conversationId"?: "uuid", "message": "..." }`
- `GET|POST|DELETE /api/memories[/:id]`
- `GET|POST|DELETE /api/tasks[/:id]`

## Security limitations

This is a starter, not a hardened multi-tenant platform. Before exposing it to the internet, add authentication, rate limiting, CSRF protection for cookie-based auth, observability, encrypted backups, stronger tenant isolation, and a job queue. Keep the LLM endpoint trusted and never put provider secrets in frontend code or commits.

## Roadmap

- Streaming responses and conversation browser
- Authenticated users and per-user memories
- Explicit approval workflow for additional tools
- Durable distributed scheduler / worker
- Tool-call protocol for remote providers
