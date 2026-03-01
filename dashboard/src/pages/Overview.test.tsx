import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import Overview from "./Overview";

vi.mock("../api", () => ({
  api: {
    dashboardSummary: vi.fn().mockResolvedValue({
      total_pipelines: 2,
      total_runs_24h: 10,
      success_count_24h: 8,
      failed_count_24h: 2,
      stale_datasets_count: 0,
    }),
    pipelines: vi.fn().mockResolvedValue([]),
    runsTrend: vi.fn().mockResolvedValue({ days: [] }),
    dashboardMetrics: vi.fn().mockResolvedValue(null),
  },
}));

describe("Overview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders overview heading", async () => {
    render(
      <BrowserRouter>
        <Overview />
      </BrowserRouter>
    );
    const heading = await screen.findByRole("heading", { name: /overview/i });
    expect(heading).toBeTruthy();
  });
});
