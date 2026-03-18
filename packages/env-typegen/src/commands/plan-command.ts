import { existsSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";

import { loadConfig, type EnvTypegenConfig } from "../config.js";
import { evaluateFleetRollout } from "../fleet/rollout-controller.js";
import { evaluatePolicy } from "../policy/policy-evaluator.js";
import { formatPlanOutput } from "../reporting/policy-report.js";
import { buildChangeSetFromValidationReport, calculateChangeSetHash } from "../sync/change-set.js";
import { createPreflightProof } from "../sync/preflight-proof.js";
import { createPreflightAttestation } from "../trust/preflight-attestation.js";
import { buildVerifyReport } from "../validation-command.js";

type PlanArgValues = {
  env?: string;
  targets?: string;
  contract?: string;
  example?: string;
  strict?: boolean;
  "no-strict"?: boolean;
  "debug-values"?: boolean;
  "cloud-provider"?: string;
  "cloud-file"?: string;
  plugin?: string;
  config?: string;
  json?: boolean;
  help?: boolean;
};

type LoadConfigModule = {
  default?: EnvTypegenConfig;
};

const PLAN_HELP_TEXT = [
  "Usage: env-typegen plan [options]",
  "",
  "Options:",
  "  --env <path>              Environment file to validate (default: .env)",
  "  --targets <list>          Comma-separated targets for drift analysis",
  "  --contract <path>         Contract file path",
  "  --example <path>          Fallback .env.example used to bootstrap contract",
  "  --strict                  Validate extras as errors",
  "  --no-strict               Downgrade extras to warnings",
  "  --debug-values            Include raw values in diagnostics",
  "  --cloud-provider <name>   vercel | cloudflare | aws",
  "  --cloud-file <path>       Cloud snapshot JSON file",
  "  --plugin <path>           Plugin module path (repeatable)",
  "  -c, --config <path>       Config file path",
  "  --json                    Emit machine-readable JSON output",
  "  -h, --help                Show this help",
  "",
  "Exit codes:",
  "  0  Plan completed with allow/warn policy decision",
  "  1  Plan completed with block policy decision or invalid usage",
].join("\n");

async function loadPlanConfig(
  configPath: string | undefined,
): Promise<EnvTypegenConfig | undefined> {
  if (configPath === undefined) {
    return loadConfig(process.cwd());
  }

  const resolvedPath = path.resolve(configPath);
  if (!existsSync(resolvedPath)) {
    const displayPath = path.isAbsolute(configPath)
      ? configPath
      : `${configPath} (resolved: ${resolvedPath})`;
    throw new Error(`Config file not found: ${displayPath}`);
  }

  const moduleValue = (await import(pathToFileURL(resolvedPath).href)) as LoadConfigModule;
  return moduleValue.default;
}

function collectVerifyArgs(values: PlanArgValues): string[] {
  const args: string[] = [];

  if (values.env !== undefined) args.push("--env", values.env);
  if (values.targets !== undefined) args.push("--targets", values.targets);
  if (values.contract !== undefined) args.push("--contract", values.contract);
  if (values.example !== undefined) args.push("--example", values.example);
  if (values.strict === true) args.push("--strict");
  if (values["no-strict"] === true) args.push("--no-strict");
  if (values["debug-values"] === true) args.push("--debug-values");
  if (values["cloud-provider"] !== undefined)
    args.push("--cloud-provider", values["cloud-provider"]);
  if (values["cloud-file"] !== undefined) args.push("--cloud-file", values["cloud-file"]);
  if (values.plugin !== undefined) args.push("--plugin", values.plugin);
  if (values.config !== undefined) args.push("--config", values.config);

  return args;
}

export async function runPlanCommand(argv: string[]): Promise<number> {
  const parsed = parseArgs({
    args: argv,
    options: {
      env: { type: "string" },
      targets: { type: "string" },
      contract: { type: "string" },
      example: { type: "string" },
      strict: { type: "boolean" },
      "no-strict": { type: "boolean" },
      "debug-values": { type: "boolean" },
      "cloud-provider": { type: "string" },
      "cloud-file": { type: "string" },
      plugin: { type: "string" },
      config: { type: "string", short: "c" },
      json: { type: "boolean" },
      help: { type: "boolean", short: "h" },
    } as const,
    allowPositionals: false,
  });

  const values = parsed.values as PlanArgValues;
  if (values.help === true) {
    console.log(PLAN_HELP_TEXT);
    return 0;
  }

  try {
    const verifyArgs = collectVerifyArgs(values);
    const report = await buildVerifyReport(verifyArgs);
    const changeSet = buildChangeSetFromValidationReport(report);
    const changeSetHash = calculateChangeSetHash(changeSet);
    const config = await loadPlanConfig(values.config);
    const policy = evaluatePolicy(report, config?.policy);
    const rollout = evaluateFleetRollout({
      stage: policy.decision === "block" ? "advisory" : "enforce",
      strategy: "fail-fast",
      orchestration: {
        aborted: false,
        rejected: policy.decision === "block" ? 1 : 0,
      },
      ...(policy.decision === "block"
        ? {
            sloEvaluation: {
              status: "breach" as const,
              allowPromotion: false,
            },
          }
        : {}),
    });
    const preflightProof = createPreflightProof({
      command: "plan",
      provider: "local-validation",
      environment: String(report.meta?.env ?? "default"),
      changeSetHash,
      policyDecision: policy.decision,
    });
    const preflightAttestation = createPreflightAttestation({
      command: "plan",
      provider: "local-validation",
      environment: String(report.meta?.env ?? "default"),
      changeSetHash,
      policyDecision: policy.decision,
      correlationId: `plan:${changeSetHash}`,
    });

    if (values.json === true) {
      process.stdout.write(
        `${JSON.stringify({
          command: "plan",
          summary: report.summary,
          status: report.status,
          changeSet,
          changeSetHash,
          preflightProof,
          preflightAttestation,
          policy,
          rollout,
          recommendations: report.recommendations ?? [],
        })}\n`,
      );
    } else {
      process.stdout.write(formatPlanOutput({ report, policy }));
    }

    return policy.decision === "block" ? 1 : 0;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    process.stderr.write(`env-typegen plan: ${message}\n`);
    return 1;
  }
}
