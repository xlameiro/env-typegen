import { describe, expect, it } from "vitest";

import { redactAuditEvent, redactSensitiveText } from "../../src/audit/audit-redaction.js";

describe("audit-redaction", () => {
  it("should redact token-like pairs and bearer tokens from free text", () => {
    const input =
      "failed token=abc123 secret=my-secret authorization: bearer super-token api_key=demo";
    const redacted = redactSensitiveText(input);

    expect(redacted).toContain("token=[REDACTED]");
    expect(redacted).toContain("secret=[REDACTED]");
    expect(redacted).toContain("authorization: bearer [REDACTED]");
    expect(redacted).toContain("api_key=[REDACTED]");
    expect(redacted).not.toContain("abc123");
    expect(redacted).not.toContain("super-token");
  });

  it("should redact reasons and message in audit events", () => {
    const redacted = redactAuditEvent({
      timestamp: new Date().toISOString(),
      event: "sync-apply.blocked",
      level: "warning",
      command: "sync-apply",
      provider: "aws-ssm",
      environment: "production",
      mode: "apply",
      policyDecision: "block",
      reasons: ["token=abc123", "authorization: bearer secret-token"],
      message: "blocked secret=my-secret",
    });

    expect(redacted.reasons?.[0]).toContain("token=[REDACTED]");
    expect(redacted.reasons?.[1]).toContain("authorization: bearer [REDACTED]");
    expect(redacted.message).toContain("secret=[REDACTED]");
  });
});
