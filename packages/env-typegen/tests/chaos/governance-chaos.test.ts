import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { runBoundedOrchestration } from "../../src/ops/concurrency-orchestrator.js";
import { evaluateExecutionBudget } from "../../src/ops/execution-budget.js";

type MatrixOperation = {
  status: "applied" | "failed";
  failureKind: "none" | "transient" | "permanent";
};

type MatrixScenario = {
  name: string;
  operations: MatrixOperation[];
  expected: {
    allowed: boolean;
    sloStatus: "healthy" | "degraded" | "breach";
    orchestrationStatus: "fulfilled" | "rejected";
  };
};

async function loadFailureMatrix(): Promise<MatrixScenario[]> {
  const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
  const matrixPath = path.resolve(currentDirectory, "../fixtures/chaos/apply-failure-matrix.json");
  const raw = await readFile(matrixPath, "utf8");
  return JSON.parse(raw) as MatrixScenario[];
}

describe("governance chaos matrix", () => {
  it("should evaluate matrix scenarios deterministically", async () => {
    const matrix = await loadFailureMatrix();

    for (const scenario of matrix) {
      const failed = scenario.operations.filter(
        (operation) => operation.status === "failed",
      ).length;
      const applied = scenario.operations.filter(
        (operation) => operation.status === "applied",
      ).length;
      const snapshot = {
        planned: scenario.operations.length,
        applied,
        failed,
        skipped: 0,
        total: scenario.operations.length,
        durationMs: 20,
      };

      const budget = evaluateExecutionBudget({
        budget: {
          maxFailureRate: 0.5,
          sloPolicy: {
            maxFailureRate: 0.5,
            blockPromotionOnBreach: true,
          },
        },
        snapshot,
      });

      expect(budget.allowed).toBe(scenario.expected.allowed);
      expect(budget.slo.status).toBe(scenario.expected.sloStatus);

      const orchestration = await runBoundedOrchestration({
        maxConcurrency: 2,
        strategy: "fail-fast",
        tasks: [
          {
            target: scenario.name,
            stage: "apply",
            run: async () => {
              if (scenario.expected.orchestrationStatus === "rejected") {
                throw new Error("chaos failure");
              }

              return "ok";
            },
          },
        ],
      });

      const status = orchestration.results[0]?.status;
      expect(status).toBe(scenario.expected.orchestrationStatus);
    }
  });
});
