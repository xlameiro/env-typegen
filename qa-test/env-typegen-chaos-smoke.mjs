import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "..");
const reportsDirectory = path.join(scriptDirectory, "reports");
const reportFilePath = path.join(
  reportsDirectory,
  "env-governance-chaos-smoke.json",
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

async function main() {
  const result = await runCommand(
    "pnpm",
    [
      "--filter",
      "@xlameiro/env-typegen",
      "test",
      "--",
      "tests/chaos/governance-chaos.test.ts",
    ],
    repositoryRoot,
  );

  await mkdir(reportsDirectory, { recursive: true });
  await writeFile(
    reportFilePath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        status: result.exitCode === 0 ? "pass" : "fail",
        exitCode: result.exitCode,
      },
      null,
      2,
    ),
    "utf8",
  );

  if (result.exitCode !== 0) {
    console.error(`GOVERNANCE_CHAOS_SMOKE_FAILED:${result.exitCode}`);
    process.exit(1);
  }

  console.log("GOVERNANCE_CHAOS_SMOKE_OK");
}

await main();
