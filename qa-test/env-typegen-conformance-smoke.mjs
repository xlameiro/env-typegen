import { spawn } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "..");
const reportsDirectory = path.join(scriptDirectory, "reports");
const reportFilePath = path.join(
  reportsDirectory,
  "env-governance-conformance-smoke.json",
);

function runCommand(command, args, cwd) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += String(chunk);
    });

    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });

    child.on("close", (code) => {
      resolve({
        exitCode: code ?? 1,
        stdout,
        stderr,
      });
    });
  });
}

function toStepResult(label, commandResult, details) {
  return {
    step: label,
    status: commandResult.exitCode === 0 ? "pass" : "fail",
    exitCode: commandResult.exitCode,
    details:
      commandResult.exitCode === 0
        ? details
        : `exitCode=${commandResult.exitCode}; stderr=${commandResult.stderr.trim()}`,
  };
}

async function runConformanceProbe() {
  const cliEntrypoint = path.join(
    repositoryRoot,
    "packages/env-typegen/dist/cli.js",
  );
  const workingDirectory = await mkdtemp(
    path.join(tmpdir(), "env-conformance-smoke-"),
  );

  try {
    const envPath = path.join(workingDirectory, ".env");
    const adapterPath = path.join(workingDirectory, "conformance-adapter.mjs");
    const configPath = path.join(workingDirectory, "env-typegen.config.mjs");

    await writeFile(envPath, "API_URL=https://example.com\n", "utf8");
    await writeFile(
      adapterPath,
      [
        "export default {",
        '  name: "conformance-adapter",',
        '  pull: async () => ({ values: { API_URL: "https://example.com" } }),',
        "  meta: () => ({",
        '    name: "conformance-adapter",',
        "    capabilities: {",
        "      pull: true,",
        "      push: false,",
        "      compare: false,",
        "      redactValuesByDefault: true,",
        "    },",
        "  }),",
        "};",
        "",
      ].join("\n"),
      "utf8",
    );
    await writeFile(
      configPath,
      [
        "export default {",
        "  input: '.env.example',",
        "  providers: {",
        `    smoke: { adapter: ${JSON.stringify(adapterPath)} },`,
        "  },",
        "  writePolicy: {",
        "    enableApply: false,",
        "    requirePreflight: false,",
        "  },",
        "};",
        "",
      ].join("\n"),
      "utf8",
    );

    const probe = await runCommand(
      "node",
      [
        cliEntrypoint,
        "sync-apply",
        "smoke",
        "--config",
        configPath,
        "--env-file",
        envPath,
        "--strategy",
        "fail-late",
        "--max-concurrency",
        "2",
        "--json",
      ],
      repositoryRoot,
    );

    if (probe.exitCode !== 0) {
      return {
        status: "fail",
        details: `sync-apply conformance probe failed with exitCode=${probe.exitCode}`,
      };
    }

    const payload = JSON.parse(probe.stdout.trim());
    const orchestration = payload.orchestration?.summary;
    const strategyPass = orchestration?.strategy === "fail-late";
    const concurrencyPass = orchestration?.maxConcurrency === 2;
    const boundedPass =
      orchestration?.total === 1 && orchestration?.fulfilled === 1;

    const passed = Boolean(strategyPass && concurrencyPass && boundedPass);

    return {
      status: passed ? "pass" : "fail",
      details: passed
        ? "bounded orchestration strategy/maxConcurrency validated"
        : "invalid orchestration strategy/maxConcurrency output",
      report: {
        strategyPass,
        concurrencyPass,
        boundedPass,
      },
    };
  } finally {
    await rm(workingDirectory, { recursive: true, force: true });
  }
}

async function main() {
  const testsResult = await runCommand(
    "pnpm",
    [
      "--filter",
      "@xlameiro/env-typegen",
      "test",
      "--",
      "tests/adapters/testkit.test.ts",
      "tests/ops/concurrency-orchestrator.test.ts",
      "tests/chaos/governance-chaos.test.ts",
    ],
    repositoryRoot,
  );

  const conformanceProbe = await runConformanceProbe();

  const steps = [
    toStepResult(
      "adapter-v3-and-orchestrator-tests",
      testsResult,
      "adapter conformance v3 + bounded orchestration tests passed",
    ),
    {
      step: "sync-apply-orchestration-probe",
      status: conformanceProbe.status,
      details: conformanceProbe.details,
      ...(conformanceProbe.report === undefined
        ? {}
        : { report: conformanceProbe.report }),
    },
  ];

  const failed = steps.filter((step) => step.status === "fail").length;
  const passed = steps.length - failed;

  await mkdir(reportsDirectory, { recursive: true });
  await writeFile(
    reportFilePath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        total: steps.length,
        passed,
        failed,
        adapterConformanceV3: steps[0]?.status === "pass",
        adapterConformanceV4: steps[0]?.status === "pass",
        boundedConcurrency: steps[1]?.status === "pass",
        results: steps,
      },
      null,
      2,
    ),
    "utf8",
  );

  if (failed > 0) {
    console.error(`GOVERNANCE_CONFORMANCE_SMOKE_FAILED:${failed}`);
    process.exit(1);
  }

  console.log(`GOVERNANCE_CONFORMANCE_SMOKE_OK:${passed}/${steps.length}`);
}

await main();
