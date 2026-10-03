import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

export type Store = ReturnType<typeof createStore>;

export function createStore(path = process.env.DATABASE_PATH ?? "./data/joda-agent.db") {
  mkdirSync(dirname(path), { recursive: true });
  const db = new Database(path);
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS conversations (id TEXT PRIMARY KEY, created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS messages (id INTEGER PRIMARY KEY AUTOINCREMENT, conversation_id TEXT NOT NULL, role TEXT NOT NULL, content TEXT NOT NULL, created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS memories (id INTEGER PRIMARY KEY AUTOINCREMENT, content TEXT NOT NULL, created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS tasks (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, run_at TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending', last_run_at TEXT);
    CREATE TABLE IF NOT EXISTS task_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, task_id INTEGER NOT NULL, message TEXT NOT NULL, created_at TEXT NOT NULL);
  `);
  return {
    db,
    addMessage(conversationId: string, role: "user" | "assistant" | "tool", content: string) {
      db.prepare("INSERT OR IGNORE INTO conversations (id, created_at) VALUES (?, ?)").run(conversationId, now());
      db.prepare("INSERT INTO messages (conversation_id, role, content, created_at) VALUES (?, ?, ?, ?)").run(conversationId, role, content, now());
    },
    messages(conversationId: string) {
      return db.prepare("SELECT role, content, created_at FROM messages WHERE conversation_id = ? ORDER BY id").all(conversationId) as Array<{ role: "user" | "assistant" | "tool"; content: string; created_at: string }>;
    },
    memories() { return db.prepare("SELECT id, content, created_at FROM memories ORDER BY id DESC LIMIT 50").all(); },
    addMemory(content: string) { return db.prepare("INSERT INTO memories (content, created_at) VALUES (?, ?)").run(content, now()); },
    deleteMemory(id: number) { return db.prepare("DELETE FROM memories WHERE id = ?").run(id); },
    tasks() { return db.prepare("SELECT * FROM tasks ORDER BY run_at").all(); },
    addTask(title: string, runAt: string) { return db.prepare("INSERT INTO tasks (title, run_at) VALUES (?, ?)").run(title, runAt); },
    deleteTask(id: number) { return db.prepare("DELETE FROM tasks WHERE id = ?").run(id); },
    runDueTasks() {
      const due = db.prepare("SELECT * FROM tasks WHERE status = 'pending' AND run_at <= ?").all(now()) as Array<{ id: number; title: string }>;
      const mark = db.prepare("UPDATE tasks SET status = 'completed', last_run_at = ? WHERE id = ?");
      const log = db.prepare("INSERT INTO task_logs (task_id, message, created_at) VALUES (?, ?, ?)");
      for (const task of due) { mark.run(now(), task.id); log.run(task.id, `Reminder delivered: ${task.title}`, now()); }
      return due;
    }
  };
}
const now = () => new Date().toISOString();
