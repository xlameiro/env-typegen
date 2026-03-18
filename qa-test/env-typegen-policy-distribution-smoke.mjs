import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { publishPolicyPack } from "../packages/env-typegen/dist/index.js";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "..");
const reportsDirectory = path.join(scriptDirectory, "reports");
const reportFilePath = path.join(
  reportsDirectory,
  "env-governance-policy-distribution-smoke.json",
);

function toResult(name, status, details) {
  return {
    name,
    status,
    details,
  };
}

async function main() {
  const temporaryDirectory = await mkdtemp(
    path.join(tmpdir(), "env-policy-distribution-"),
  );
  const fixturePath = path.join(
    repositoryRoot,
    "packages/env-typegen/tests/fixtures/policy/packs/base-governance.policy.json",
  );

  try {
    const content = await readFile(fixturePath, "utf8");
    const results = [];

    const localPublish = await publishPolicyPack({
      source: fixturePath,
      content,
      channel: "dev",
      target: {
        sink: "local",
        destination: temporaryDirectory,
      },
    });
    results.push(
      toResult(
        "local-publish",
        localPublish.destination.includes(
          path.join("dev", "base-governance@1.policy.json"),
        )
          ? "pass"
          : "fail",
        localPublish.destination,
      ),
    );

    const remotePublish = await publishPolicyPack({
      source: fixturePath,
      content,
      channel: "stage",
      promotedFrom: "dev",
      target: {
        sink: "s3",
        destination: temporaryDirectory,
      },
    });
    results.push(
      toResult(
        "remote-descriptor",
        remotePublish.destination.includes(
          path.join("stage", "base-governance@1.publish-request.json"),
        )
          ? "pass"
          : "fail",
        remotePublish.destination,
      ),
    );

    try {
      await publishPolicyPack({
        source: fixturePath,
        content,
        channel: "prod",
        promotedFrom: "dev",
        target: {
          sink: "local",
          destination: temporaryDirectory,
        },
      });

      results.push(
        toResult(
          "promotion-guard",
          "fail",
          "expected invalid promotion path to fail",
        ),
      );
    } catch (error) {
      results.push(
        toResult(
          "promotion-guard",
          error instanceof Error &&
            /Invalid policy promotion path/u.test(error.message)
            ? "pass"
            : "fail",
          error instanceof Error ? error.message : "unknown error",
        ),
      );
    }

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
          localPublish: results[0]?.status === "pass",
          remoteDescriptor: results[1]?.status === "pass",
          promotionGuard: results[2]?.status === "pass",
          results,
        },
        null,
        2,
      ),
      "utf8",
    );

    if (failed > 0) {
      console.error(`GOVERNANCE_POLICY_DISTRIBUTION_SMOKE_FAILED:${failed}`);
      process.exit(1);
    }

    console.log(
      `GOVERNANCE_POLICY_DISTRIBUTION_SMOKE_OK:${passed}/${results.length}`,
    );
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
}

await main();
