import { describe, expect, it } from "vitest";
import { calculate, executeTool } from "./tools.js";

describe("safe tools", () => {
  it("calculates basic expressions", () => expect(calculate("7 * (8 + 2)")).toBe(70));
  it("rejects non-allowlisted tools", () => expect(executeTool("shell", { command: "whoami" }).ok).toBe(false));
  it("rejects unsafe calculator input", () => expect(executeTool("calculator", { expression: "process.exit()" }).ok).toBe(false));
});
