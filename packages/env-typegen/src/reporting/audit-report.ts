import type { AuditEvent } from "../audit/audit-event.js";
import { redactSensitiveText } from "../audit/audit-redaction.js";

export function formatAuditEvent(event: AuditEvent): string {
  const header =
    `[audit] ${event.event} provider=${event.provider} env=${event.environment} mode=${event.mode}` +
    (event.correlationId === undefined ? "" : ` correlationId=${event.correlationId}`);
  let lines: string[] = [header, `level=${event.level} policy=${event.policyDecision}`];

  if (event.changeSetHash !== undefined) {
    lines = [...lines, `changeSetHash=${event.changeSetHash}`];
  }

  if (event.summary !== undefined) {
    const plannedPrefix =
      event.summary.planned === undefined ? "" : `planned=${event.summary.planned}, `;
    lines = [
      ...lines,
      `summary: ${plannedPrefix}applied=${event.summary.applied}, failed=${event.summary.failed}, skipped=${event.summary.skipped}, total=${event.summary.total}`,
    ];
  }

  if (event.operationStatuses !== undefined) {
    lines = [
      ...lines,
      `operationStatuses: planned=${event.operationStatuses.planned}, applied=${event.operationStatuses.applied}, failed=${event.operationStatuses.failed}, skipped=${event.operationStatuses.skipped}`,
    ];
  }

  if (event.reasons !== undefined && event.reasons.length > 0) {
    lines = [
      ...lines,
      "reasons:",
      ...event.reasons.map((reason) => `- ${redactSensitiveText(reason)}`),
    ];
  }

  lines = [...lines, `message: ${redactSensitiveText(event.message)}`];
  return `${lines.join("\n")}\n`;
}
