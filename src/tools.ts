import { z } from "zod";

export const toolNames = ["current_time", "calculator"] as const;
export type ToolName = typeof toolNames[number];
const calculation = z.object({ expression: z.string().min(1).max(120) });

export function calculate(expression: string): number {
  if (!/^[0-9+\-*/().\s]+$/.test(expression)) throw new Error("Only numbers, parentheses and + - * / are allowed.");
  const value = Function(`"use strict"; return (${expression})`)();
  if (typeof value !== "number" || !Number.isFinite(value)) throw new Error("Expression did not produce a finite number.");
  return value;
}

export function executeTool(name: string, args: unknown) {
  if (!toolNames.includes(name as ToolName)) return { ok: false, error: "Tool is not allowlisted." };
  try {
    if (name === "current_time") return { ok: true, tool: name, result: { iso: new Date().toISOString() } };
    const { expression } = calculation.parse(args);
    return { ok: true, tool: name, result: { expression, value: calculate(expression) } };
  } catch (error) {
    return { ok: false, tool: name, error: error instanceof Error ? error.message : "Invalid tool request." };
  }
}
