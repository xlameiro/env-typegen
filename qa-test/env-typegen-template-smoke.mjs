import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { bootstrapFromManifest } from "../packages/env-typegen/dist/multi-repo/bootstrap.js";
import { resolveGovernanceTemplate } from "../packages/env-typegen/dist/templates/template-resolver.js";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const reportsDirectory = path.join(scriptDirectory, "reports");
const reportFilePath = path.join(
  reportsDirectory,
  "env-governance-template-smoke.json",
);

function toResult(name, status, details) {
  return {
    name,
    status,
    details,
  };
}

async function runTemplateResolverProbe() {
  const resolved = resolveGovernanceTemplate({
    template: "library",
    overlay: {
      policyChannel: "prod",
    },
  });

  const passed =
    resolved.template === "library" &&
    resolved.stage === "advisory-enforce" &&
    resolved.enforcementLevel === "standard" &&
    resolved.policyChannel === "prod";

  return toResult(
    "template-resolver",
    passed ? "pass" : "fail",
    passed
      ? "template defaults + overlay resolution is deterministic"
      : "unexpected template resolution output",
  );
}

async function runBootstrapProbe() {
  const workingDirectory = await mkdtemp(
    path.join(tmpdir(), "env-template-smoke-"),
  );

  try {
    const manifestPath = path.join(workingDirectory, "fleet-manifest.json");

    await writeFile(
      manifestPath,
      JSON.stringify(
        {
          version: 1,
          fleet: [
            {
              id: "api-service",
              repository: "github.com/acme/api-service",
              root: "services/api",
              provider: "awsSsm",
              environment: "production",
              stage: "enforce",
              template: "web-app",
            },
          ],
        },
        null,
        2,
      ),
      "utf8",
    );

    const plan = await bootstrapFromManifest(manifestPath);
    const target = plan.targets[0];

    const passed =
      target?.template === "web-app" &&
      target?.enforcementLevel === "strict" &&
      target?.policyChannel === "stage" &&
      plan.summary.total === 1;

    return toResult(
      "bootstrap-plan",
      passed ? "pass" : "fail",
      passed
        ? "bootstrap plan resolves template defaults deterministically"
        : "bootstrap plan did not include expected template metadata",
    );
  } finally {
    await rm(workingDirectory, { recursive: true, force: true });
  }
}

async function runInvalidManifestProbe() {
  const workingDirectory = await mkdtemp(
    path.join(tmpdir(), "env-template-smoke-invalid-"),
  );

  try {
    const manifestPath = path.join(workingDirectory, "fleet-manifest.json");

    await writeFile(
      manifestPath,
      JSON.stringify(
        {
          version: 1,
          fleet: [
            {
              id: "api-service",
              repository: "github.com/acme/api-service",
              root: "services/api",
              provider: "awsSsm",
              environment: "production",
              stage: "enforce",
              template: "unknown-template",
            },
          ],
        },
        null,
        2,
      ),
      "utf8",
    );

    try {
      await bootstrapFromManifest(manifestPath);
      return toResult(
        "invalid-template-manifest",
        "fail",
        "expected invalid template manifest to fail parsing",
      );
    } catch (error) {
      return toResult(
        "invalid-template-manifest",
        "pass",
        error instanceof Error ? error.message : "invalid manifest rejected",
      );
    }
  } finally {
    await rm(workingDirectory, { recursive: true, force: true });
  }
}

async function main() {
  const results = [
    await runTemplateResolverProbe(),
    await runBootstrapProbe(),
    await runInvalidManifestProbe(),
  ];

  const failed = results.filter((result) => result.status === "fail").length;
  const passed = results.length - failed;

  await mkdir(reportsDirectory, { recursive: true });
  await writeFile(
    reportFilePath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        total: results.length,
        passed,
        failed,
        templateResolver: results[0]?.status === "pass",
        bootstrapPlan: results[1]?.status === "pass",
        invalidTemplateGuard: results[2]?.status === "pass",
        results,
      },
      null,
      2,
    ),
    "utf8",
  );

  if (failed > 0) {
    const content = await readFile(reportFilePath, "utf8");
    console.error(content);
    process.exit(1);
  }

  console.log(`GOVERNANCE_TEMPLATE_SMOKE_OK:${passed}/${results.length}`);
}

await main();
