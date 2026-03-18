import type { AuditEvent } from "./audit-event.js";

const REDACTION_PATTERNS: ReadonlyArray<{ pattern: RegExp; replacement: string }> = [
  {
    pattern: /\b(token|secret|api[_-]?key|password)=([^\s]+)/giu,
    replacement: "$1=[REDACTED]",
  },
  {
    pattern: /\bauthorization:\s*bearer\s+[^\s]+/giu,
    replacement: "authorization: bearer [REDACTED]",
  },
];

export function redactSensitiveText(input: string): string {
  return REDACTION_PATTERNS.reduce(
    (accumulator, rule) => accumulator.replaceAll(rule.pattern, rule.replacement),
    input,
  );
}

export function redactAuditEvent(event: AuditEvent): AuditEvent {
  return {
    ...event,
    ...(event.reasons === undefined
      ? {}
      : { reasons: event.reasons.map((reason) => redactSensitiveText(reason)) }),
    message: redactSensitiveText(event.message),
  };
}
