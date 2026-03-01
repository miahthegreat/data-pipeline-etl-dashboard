import { describe, it, expect, vi } from "vitest";

describe("api", () => {
  it("BASE is string", async () => {
    const { api } = await import("./api");
    expect(api).toBeDefined();
    expect(typeof api.dashboardSummary).toBe("function");
    expect(typeof api.pipelines).toBe("function");
  });
});
