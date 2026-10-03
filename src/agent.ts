import { executeTool } from "./tools.js";

export type ChatMessage = { role: "user" | "assistant" | "tool"; content: string };
export type AgentResult = { text: string; toolResult?: ReturnType<typeof executeTool> };

export async function runAgent(input: string, memories: Array<{ content: string }>): Promise<AgentResult> {
  const provider = process.env.LLM_BASE_URL && process.env.LLM_API_KEY ? "remote" : "mock";
  if (provider === "remote") return openAiCompatible(input, memories);
  const calculator = input.match(/^\s*(?:calculate|calc)\s+(.+)$/i);
  if (calculator) {
    const result = executeTool("calculator", { expression: calculator[1] });
    return { text: result.ok ? `The result is **${String(result.result.value)}**.` : `I could not calculate that: ${result.error}`, toolResult: result };
  }
  if (/\b(time|date)\b/i.test(input)) {
    const result = executeTool("current_time", {});
    return { text: result.ok ? `Current UTC time: ${result.result.iso}` : "Time tool failed.", toolResult: result };
  }
  const context = memories.slice(0, 6).map((m) => `• ${m.content}`).join("\n");
  return { text: `**Offline mode** — I received: “${input}”.${context ? `\n\nRelevant saved notes:\n${context}` : ""}\n\nSet LLM_BASE_URL and LLM_API_KEY to use an OpenAI-compatible provider. Try “calculate 7 * (8 + 2)” or ask for the time.` };
}

async function openAiCompatible(input: string, memories: Array<{ content: string }>): Promise<AgentResult> {
  const base = process.env.LLM_BASE_URL!.replace(/\/$/, "");
  const response = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${process.env.LLM_API_KEY}` },
    body: JSON.stringify({ model: process.env.LLM_MODEL ?? "gpt-4o-mini", messages: [
      { role: "system", content: `You are Joda Agent. Be helpful and concise. User memories:\n${memories.slice(0, 6).map((m) => m.content).join("\n")}` },
      { role: "user", content: input }
    ], temperature: 0.4 })
  });
  if (!response.ok) throw new Error(`LLM request failed (${response.status}).`);
  const payload = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  return { text: payload.choices?.[0]?.message?.content ?? "The model returned no text." };
}
