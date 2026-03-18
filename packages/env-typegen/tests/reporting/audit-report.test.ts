import { describe, expect, it } from "vitest";

import type { AuditEvent } from "../../src/audit/audit-event.js";
import { formatAuditEvent } from "../../src/reporting/audit-report.js";

function makeBaseEvent(): AuditEvent {
  return {
    timestamp: "2026-03-18T00:00:00.000Z",
    event: "sync-apply.completed",
    level: "info",
    command: "sync-apply",
    provider: "vercel",
    environment: "preview",
    mode: "dry-run",
    policyDecision: "allow",
    message: "completed token=abc123",
  };
}

describe("audit-report", () => {
  it("should format a minimal audit event", () => {
    const output = formatAuditEvent(makeBaseEvent());

    expect(output).toContain(
      "[audit] sync-apply.completed provider=vercel env=preview mode=dry-run",
    );
    expect(output).toContain("level=info policy=allow");
    expect(output).toContain("message: completed token=[REDACTED]");
  });

  it("should include optional fields and redact reasons", () => {
    const output = formatAuditEvent({
      ...makeBaseEvent(),
      correlationId: "corr-1",
      changeSetHash: "a".repeat(64),
      summary: {
        planned: 4,
        applied: 2,
        failed: 1,
        skipped: 1,
        total: 4,
      },
      operationStatuses: {
        planned: 4,
        applied: 2,
        failed: 1,
        skipped: 1,
      },
      reasons: ["authorization: bearer secret-token", "secret=very-sensitive"],
      message: "blocked api_key=top-secret",
    });

    expect(output).toContain("correlationId=corr-1");
    expect(output).toContain("changeSetHash=");
    expect(output).toContain("summary: planned=4, applied=2, failed=1, skipped=1, total=4");
    expect(output).toContain("operationStatuses: planned=4, applied=2, failed=1, skipped=1");
    expect(output).toContain("- authorization: bearer [REDACTED]");
    expect(output).toContain("- secret=[REDACTED]");
    expect(output).toContain("message: blocked api_key=[REDACTED]");
    expect(output).not.toContain("secret-token");
    expect(output).not.toContain("top-secret");
  });
});
