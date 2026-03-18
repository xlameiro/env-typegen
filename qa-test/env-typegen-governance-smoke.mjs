import { spawn } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "..");
const reportsDirectory = path.join(scriptDirectory, "reports");
const reportFilePath = path.join(reportsDirectory, "env-governance-smoke.json");

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
        command,
        args,
        code: code ?? 1,
        stdout,
        stderr,
      });
    });
  });
}

async function main() {
  const workingDirectory = await mkdtemp(
    path.join(tmpdir(), "env-governance-smoke-"),
  );
  const smokeResults = [];
  const cliEntrypoint = path.join(
    repositoryRoot,
    "packages/env-typegen/dist/cli.js",
  );

  try {
    const envPath = path.join(workingDirectory, ".env");
    const brokenEnvPath = path.join(workingDirectory, ".env.broken");
    const contractPath = path.join(workingDirectory, "env.contract.mjs");
    const adapterPath = path.join(workingDirectory, "smoke-adapter.mjs");
    const configPath = path.join(workingDirectory, "env-typegen.config.mjs");

    await writeFile(
      envPath,
      ["API_URL=https://example.com", "PORT=3000", "FEATURE_FLAG=enabled"].join(
        "\n",
      ) + "\n",
      "utf8",
    );
    await writeFile(brokenEnvPath, "EXTRA_ONLY=true\n", "utf8");
    await writeFile(
      contractPath,
      [
        "export default {",
        "  schemaVersion: 1,",
        "  variables: {",
        '    API_URL: { expected: { type: "url" }, required: true, clientSide: false },',
        '    PORT: { expected: { type: "number" }, required: true, clientSide: false },',
        '    FEATURE_FLAG: { expected: { type: "string" }, required: false, clientSide: false },',
        "  },",
        "};",
        "",
      ].join("\n"),
      "utf8",
    );
    await writeFile(
      adapterPath,
      [
        "export default {",
        '  name: "smoke-adapter",',
        '  pull: async () => ({ values: { API_URL: "https://example.com", PORT: "3000", FEATURE_FLAG: "enabled" } }),',
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
        "    smoke: {",
        `      adapter: ${JSON.stringify(adapterPath)},`,
        "    },",
        "  },",
        "  writePolicy: {",
        "    enableApply: false,",
        "    requirePreflight: true,",
        "  },",
        "};",
        "",
      ].join("\n"),
      "utf8",
    );

    const run = async (name, args, expectCode) => {
      const result = await runCommand(
        "node",
        [cliEntrypoint, ...args],
        repositoryRoot,
      );
      const isPass =
        expectCode === "non-zero"
          ? result.code !== 0
          : result.code === expectCode;
      smokeResults.push({
        name,
        status: isPass ? "pass" : "fail",
        details: isPass
          ? `exitCode=${result.code}`
          : `unexpected exitCode=${result.code}; stdout=${result.stdout.trim()} stderr=${result.stderr.trim()}`,
      });
    };

    await run(
      "verify should pass for valid env",
      [
        "verify",
        "--env",
        envPath,
        "--targets",
        envPath,
        "--contract",
        contractPath,
        "--json",
      ],
      0,
    );
    await run(
      "verify should fail for missing required variables",
      [
        "verify",
        "--env",
        brokenEnvPath,
        "--targets",
        brokenEnvPath,
        "--contract",
        contractPath,
        "--json",
      ],
      "non-zero",
    );
    await run(
      "pull should return provider keys",
      ["pull", "smoke", "--config", configPath, "--json"],
      0,
    );
    await run(
      "plan should pass for valid env",
      [
        "plan",
        "--env",
        envPath,
        "--targets",
        envPath,
        "--contract",
        contractPath,
        "--json",
      ],
      0,
    );
    await run(
      "sync-preview should pass in read-only mode",
      [
        "sync-preview",
        "smoke",
        "--config",
        configPath,
        "--env-file",
        envPath,
        "--json",
      ],
      0,
    );

    const syncApplyDryRunResult = await runCommand(
      "node",
      [
        cliEntrypoint,
        "sync-apply",
        "smoke",
        "--config",
        configPath,
        "--env-file",
        envPath,
        "--json",
      ],
      repositoryRoot,
    );
    let syncApplyDryRunPassed = syncApplyDryRunResult.code === 0;
    if (syncApplyDryRunPassed) {
      try {
        const payload = JSON.parse(syncApplyDryRunResult.stdout.trim());
        syncApplyDryRunPassed = payload.governanceSummary?.outcome === "pass";
      } catch {
        syncApplyDryRunPassed = false;
      }
    }
    smokeResults.push({
      name: "sync-apply dry-run should emit passing governance summary",
      status: syncApplyDryRunPassed ? "pass" : "fail",
      details: syncApplyDryRunPassed
        ? `exitCode=${syncApplyDryRunResult.code}`
        : `unexpected output; stdout=${syncApplyDryRunResult.stdout.trim()} stderr=${syncApplyDryRunResult.stderr.trim()}`,
    });

    await mkdir(reportsDirectory, { recursive: true });

    const summary = {
      generatedAt: new Date().toISOString(),
      promotionStage: "advisory-enforce",
      total: smokeResults.length,
      passed: smokeResults.filter((result) => result.status === "pass").length,
      failed: smokeResults.filter((result) => result.status === "fail").length,
      results: smokeResults,
    };

    await writeFile(reportFilePath, JSON.stringify(summary, null, 2), "utf8");

    if (summary.failed > 0) {
      console.error(`GOVERNANCE_SMOKE_FAILED:${summary.failed}`);
      process.exit(1);
    }

    console.log(`GOVERNANCE_SMOKE_OK:${summary.passed}/${summary.total}`);
  } finally {
    await rm(workingDirectory, { recursive: true, force: true });
  }
}

await main();
