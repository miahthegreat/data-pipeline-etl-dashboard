import { describe, it, expect } from "vitest";

describe("api", () => {
  it("exposes expected methods", async () => {
    const { api } = await import("./api");
    expect(api).toBeDefined();
    expect(typeof api.dashboardSummary).toBe("function");
    expect(typeof api.pipelines).toBe("function");
    expect(typeof api.runs).toBe("function");
    expect(typeof api.runCreate).toBe("function");
    expect(typeof api.freshness).toBe("function");
    expect(typeof api.freshnessCreate).toBe("function");
    expect(typeof api.dashboardMetrics).toBe("function");
    expect(typeof api.alertRules).toBe("function");
    expect(typeof api.alertDeliveries).toBe("function");
  });
});
