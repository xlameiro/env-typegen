import { describe, expect, it } from "vitest";

import {
  buildDoctorReport,
  diffEnvironmentSources,
  validateAgainstContract,
} from "../../src/validation/engine.js";
import type { EnvContract } from "../../src/validation/types.js";

const contract: EnvContract = {
  schemaVersion: 1,
  variables: {
    DATABASE_URL: {
      expected: { type: "url" },
      required: true,
      clientSide: false,
      secret: true,
    },
    PORT: {
      expected: { type: "number", min: 1000, max: 9000 },
      required: true,
      clientSide: false,
    },
    NEXT_PUBLIC_API_URL: {
      expected: { type: "url" },
      required: true,
      clientSide: true,
      secret: false,
    },
  },
};

describe("validation engine", () => {
  it("should report missing required variables as errors", () => {
    const report = validateAgainstContract({
      contract,
      values: { PORT: "3000" },
      environment: "local",
      strict: true,
      debugValues: false,
    });

    expect(report.status).toBe("fail");
    expect(report.issues.some((issue) => issue.code === "ENV_MISSING")).toBe(true);
  });

  it("should downgrade extra variables to warnings when strict is false", () => {
    const report = validateAgainstContract({
      contract,
      values: {
        DATABASE_URL: "https://db.example.com",
        PORT: "3000",
        NEXT_PUBLIC_API_URL: "https://api.example.com",
        EXTRA_FLAG: "true",
      },
      environment: "local",
      strict: false,
      debugValues: false,
    });

    const extra = report.issues.find((issue) => issue.code === "ENV_EXTRA");
    expect(extra?.severity).toBe("warning");
  });

  it("should detect secret exposure when secret is marked client-side", () => {
    const insecureContract: EnvContract = {
      schemaVersion: 1,
      variables: {
        NEXT_PUBLIC_SECRET_TOKEN: {
          expected: { type: "string" },
          required: true,
          clientSide: true,
          secret: true,
        },
      },
    };

    const report = validateAgainstContract({
      contract: insecureContract,
      values: { NEXT_PUBLIC_SECRET_TOKEN: "plain-secret" },
      environment: "local",
      strict: true,
      debugValues: false,
    });

    expect(report.issues.some((issue) => issue.code === "ENV_SECRET_EXPOSED")).toBe(true);
  });

  it("should detect drift and conflicts across sources", () => {
    const report = diffEnvironmentSources({
      contract,
      strict: true,
      debugValues: false,
      sources: {
        ".env": {
          DATABASE_URL: "https://db.example.com",
          PORT: "3000",
          NEXT_PUBLIC_API_URL: "https://api.example.com",
        },
        ".env.example": {
          DATABASE_URL: "https://db.example.com",
          PORT: "not-a-number",
        },
      },
    });

    expect(report.status).toBe("fail");
    expect(report.issues.some((issue) => issue.code === "ENV_CONFLICT")).toBe(true);
    expect(report.issues.some((issue) => issue.code === "ENV_MISSING")).toBe(true);
  });

  it("should merge check and diff reports into doctor report with recommendations", () => {
    const checkReport = validateAgainstContract({
      contract,
      values: { DATABASE_URL: "", PORT: "3000", NEXT_PUBLIC_API_URL: "https://api.example.com" },
      environment: "local",
      strict: true,
      debugValues: false,
    });
    const diffReport = diffEnvironmentSources({
      contract,
      strict: true,
      debugValues: false,
      sources: {
        ".env": { DATABASE_URL: "https://db.example.com", PORT: "3000" },
        ".env.production": { DATABASE_URL: "https://db.example.com", PORT: "3000" },
      },
    });

    const doctor = buildDoctorReport({ checkReport, diffReport });

    expect(doctor.recommendations?.length).toBeGreaterThan(0);
    expect(doctor.status).toBe("fail");
  });
});
