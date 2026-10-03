import { afterAll, describe, expect, it } from "vitest";
import { buildApp } from "./server.js";

const app = buildApp(":memory:");
afterAll(() => app.close());
describe("health API", () => {
  it("reports service health", async () => {
    const response = await app.inject({ method: "GET", url: "/api/health" });
    expect(response.statusCode).toBe(200);
    expect(response.json().ok).toBe(true);
  });
});
