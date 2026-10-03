import Fastify from "fastify";
import cors from "@fastify/cors";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
import { runAgent } from "./agent.js";
import { createStore } from "./store.js";

export function buildApp(databasePath?: string) {
  const app = Fastify({ logger: true });
  const store = createStore(databasePath);
  app.register(cors, { origin: process.env.CORS_ORIGIN?.split(",") ?? true });
  app.get("/api/health", async () => ({ ok: true, mode: process.env.LLM_BASE_URL && process.env.LLM_API_KEY ? "remote" : "mock" }));
  app.get("/api/memories", async () => store.memories());
  app.post("/api/memories", async (request, reply) => {
    const parsed = z.object({ content: z.string().min(1).max(1000) }).safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "content must be 1–1000 characters" });
    return reply.code(201).send({ id: store.addMemory(parsed.data.content).lastInsertRowid });
  });
  app.delete("/api/memories/:id", async (request) => store.deleteMemory(z.coerce.number().int().positive().parse((request.params as { id: string }).id)));
  app.get("/api/tasks", async () => store.tasks());
  app.post("/api/tasks", async (request, reply) => {
    const parsed = z.object({ title: z.string().min(1).max(300), runAt: z.string().datetime() }).safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "title and ISO runAt are required" });
    if (new Date(parsed.data.runAt) <= new Date()) return reply.code(400).send({ error: "runAt must be in the future" });
    return reply.code(201).send({ id: store.addTask(parsed.data.title, parsed.data.runAt).lastInsertRowid });
  });
  app.delete("/api/tasks/:id", async (request) => store.deleteTask(z.coerce.number().int().positive().parse((request.params as { id: string }).id)));
  app.post("/api/chat", async (request, reply) => {
    const parsed = z.object({ conversationId: z.string().uuid().optional(), message: z.string().min(1).max(6000) }).safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "message is required (maximum 6000 characters)" });
    const conversationId = parsed.data.conversationId ?? randomUUID();
    store.addMessage(conversationId, "user", parsed.data.message);
    try {
      const result = await runAgent(parsed.data.message, store.memories() as Array<{ content: string }>);
      store.addMessage(conversationId, "assistant", result.text);
      return { conversationId, response: result.text, toolResult: result.toolResult };
    } catch (error) { return reply.code(502).send({ error: error instanceof Error ? error.message : "Agent request failed" }); }
  });
  app.get("/", async (_request, reply) => reply.type("text/html").send(await readFile(join(process.cwd(), "public/index.html"), "utf8")));
  setInterval(() => { const due = store.runDueTasks(); if (due.length) app.log.info({ due }, "Executed safe reminder tasks"); }, 30_000).unref();
  return app;
}

const app = buildApp();
app.listen({ port: Number(process.env.PORT ?? 3000), host: "0.0.0.0" }).catch((error) => { app.log.error(error); process.exit(1); });
