import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import type { ValidationIssue, ValidationReport } from "./types.js";

type JsonOutputMode = "off" | "compact" | "pretty";

type EmitValidationReportOptions = {
  report: ValidationReport;
  jsonMode: JsonOutputMode;
  outputFile?: string;
};

function toJsonString(report: ValidationReport, mode: JsonOutputMode): string {
  if (mode === "pretty") return `${JSON.stringify(report, null, 2)}\n`;
  return `${JSON.stringify(report)}\n`;
}

function formatIssue(issue: ValidationIssue): string {
  const expected = issue.expected === undefined ? "" : ` expected=${issue.expected.type}`;
  const received = issue.receivedType === undefined ? "" : ` received=${issue.receivedType}`;
  return `${issue.severity.toUpperCase()} [${issue.code}] ${issue.environment}:${issue.key} ${issue.message}${expected}${received}`;
}

function formatHumanReport(report: ValidationReport): string {
  const lines: string[] = [];
  lines.push(
    `Status: ${report.status.toUpperCase()} (errors=${report.summary.errors}, warnings=${report.summary.warnings}, total=${report.summary.total})`,
  );
  if (report.issues.length > 0) {
    lines.push("", "Issues:");
    for (const issue of report.issues) {
      lines.push(`- ${formatIssue(issue)}`);
    }
  }
  if (report.recommendations !== undefined && report.recommendations.length > 0) {
    lines.push("", "Recommendations:");
    for (const recommendation of report.recommendations) {
      lines.push(`- ${recommendation}`);
    }
  }
  return `${lines.join("\n")}\n`;
}

async function persistJsonOutput(outputFile: string, report: ValidationReport): Promise<void> {
  const resolvedPath = path.resolve(outputFile);
  await mkdir(path.dirname(resolvedPath), { recursive: true });
  await writeFile(resolvedPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
}

export async function emitValidationReport(options: EmitValidationReportOptions): Promise<void> {
  const { report, outputFile, jsonMode } = options;

  if (outputFile !== undefined) {
    await persistJsonOutput(outputFile, report);
  }

  if (jsonMode === "off") {
    process.stdout.write(formatHumanReport(report));
    return;
  }

  process.stdout.write(toJsonString(report, jsonMode));
}
