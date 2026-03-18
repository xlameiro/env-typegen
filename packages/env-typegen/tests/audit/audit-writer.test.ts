import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import type { AuditEvent } from "../../src/audit/audit-event.js";
import {
  serializeAuditEvent,
  writeAuditEvent,
  writeAuditEvents,
} from "../../src/audit/audit-writer.js";

function makeEvent(): AuditEvent {
  return {
    timestamp: new Date().toISOString(),
    event: "sync-apply.completed",
    level: "info",
    command: "sync-apply",
    provider: "aws-ssm",
    environment: "production",
    mode: "apply",
    policyDecision: "allow",
    reasons: ["branch ok", "token=abc123"],
    message: "Completed with token=abc123",
    summary: {
      applied: 2,
      failed: 0,
      skipped: 1,
      total: 3,
    },
  };
}

describe("audit-writer", () => {
  it("should redact token-like fragments from serialized payload", () => {
    const serialized = serializeAuditEvent(makeEvent());
    expect(serialized).toContain("token=[REDACTED]");
    expect(serialized).not.toContain("abc123");
  });

  it("should append JSONL lines to file when filePath is provided", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "env-typegen-audit-"));
    const auditPath = path.join(dir, "audit.log");

    await writeAuditEvent({ event: makeEvent(), filePath: auditPath });
    await writeAuditEvent({ event: makeEvent(), filePath: auditPath });

    const content = await readFile(auditPath, "utf8");
    const lines = content.trim().split("\n");
    expect(lines).toHaveLength(2);
    expect(lines[0]).toContain("sync-apply.completed");
  });

  it("should append lifecycle events in a single bulk write", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "env-typegen-audit-bulk-"));
    const auditPath = path.join(dir, "audit.log");

    const events: AuditEvent[] = [
      {
        ...makeEvent(),
        event: "sync-apply.requested",
        message: "Requested token=abc123",
      },
      {
        ...makeEvent(),
        event: "sync-apply.completed",
        message: "Completed token=abc123",
      },
    ];

    const lines = await writeAuditEvents({ events, filePath: auditPath });
    expect(lines).toHaveLength(2);

    const content = await readFile(auditPath, "utf8");
    expect(content).toContain("sync-apply.requested");
    expect(content).toContain("sync-apply.completed");
    expect(content).not.toContain("abc123");
  });
});
