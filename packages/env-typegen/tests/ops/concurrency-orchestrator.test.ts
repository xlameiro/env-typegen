import { describe, expect, it } from "vitest";

import { runBoundedOrchestration } from "../../src/ops/concurrency-orchestrator.js";

describe("runBoundedOrchestration", () => {
  it("should run all tasks in fail-late mode and preserve input order", async () => {
    const activeCount = { current: 0, maxSeen: 0 };
    const tasks = ["a", "b", "c", "d"].map((target, index) => ({
      target,
      stage: "enforce" as const,
      run: async () => {
        activeCount.current += 1;
        activeCount.maxSeen = Math.max(activeCount.maxSeen, activeCount.current);
        await new Promise((resolve) => setTimeout(resolve, 10 - index));
        activeCount.current -= 1;

        if (target === "b") {
          throw new Error("intentional failure");
        }

        return `${target}-ok`;
      },
    }));

    const result = await runBoundedOrchestration({
      tasks,
      maxConcurrency: 2,
      strategy: "fail-late",
    });

    expect(result.summary.total).toBe(4);
    expect(result.summary.fulfilled).toBe(3);
    expect(result.summary.rejected).toBe(1);
    expect(result.summary.skipped).toBe(0);
    expect(result.summary.aborted).toBe(false);
    expect(activeCount.maxSeen).toBeLessThanOrEqual(2);

    expect(result.results[0]?.status).toBe("fulfilled");
    expect(result.results[1]?.status).toBe("rejected");
    expect(result.results[2]?.status).toBe("fulfilled");
    expect(result.results[3]?.status).toBe("fulfilled");
  });

  it("should stop pending tasks in fail-fast mode after first rejection", async () => {
    const tasks = [
      {
        target: "dev",
        stage: "advisory" as const,
        run: async () => "dev-ok",
      },
      {
        target: "staging",
        stage: "enforce" as const,
        run: async () => {
          throw new Error("staging failed");
        },
      },
      {
        target: "prod",
        stage: "apply" as const,
        run: async () => "prod-ok",
      },
    ];

    const result = await runBoundedOrchestration({
      tasks,
      maxConcurrency: 1,
      strategy: "fail-fast",
    });

    expect(result.summary.fulfilled).toBe(1);
    expect(result.summary.rejected).toBe(1);
    expect(result.summary.skipped).toBe(1);
    expect(result.summary.aborted).toBe(true);
    expect(result.results[2]?.status).toBe("skipped");
  });

  it("should normalize invalid maxConcurrency to one", async () => {
    const tasks = [
      {
        target: "only",
        stage: "enforce" as const,
        run: async () => "ok",
      },
    ];

    const result = await runBoundedOrchestration({
      tasks,
      maxConcurrency: 0,
      strategy: "fail-late",
    });

    expect(result.summary.maxConcurrency).toBe(1);
    expect(result.summary.effectiveConcurrency).toBe(1);
    expect(result.summary.fulfilled).toBe(1);
  });

  it("should reduce effective concurrency when SLO and incident throttling are active", async () => {
    const tasks = Array.from({ length: 6 }, (_, index) => ({
      target: `target-${index}`,
      stage: "enforce" as const,
      run: async () => `ok-${index}`,
    }));

    const result = await runBoundedOrchestration({
      tasks,
      maxConcurrency: 8,
      strategy: "fail-late",
      sloEvaluation: {
        status: "degraded",
        violations: [],
        throttleFactor: 0.5,
        allowPromotion: true,
        metrics: {
          total: 6,
          durationMs: 20,
          failureRate: 0,
          successRate: 1,
        },
      },
      incidentState: {
        status: "incident",
        reason: "manual throttle",
        since: "2026-03-18T00:00:00.000Z",
        consecutiveBreaches: 2,
        throttleFactor: 0.25,
      },
    });

    expect(result.summary.maxConcurrency).toBe(8);
    expect(result.summary.effectiveConcurrency).toBe(2);
    expect(result.summary.throttleFactor).toBe(0.25);
    expect(result.summary.sloStatus).toBe("degraded");
    expect(result.summary.incidentStatus).toBe("incident");
  });
});
