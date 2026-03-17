import fs from "node:fs/promises";
import path from "node:path";

import {
  applyContractPlugins,
  applyReportPlugins,
  applySourcePlugins,
  buildCiReport,
  defineConfig,
  defineContract,
  formatCiReport,
  generateDeclaration,
  generateT3Env,
  generateTypeScriptTypes,
  generateZodSchema,
  inferType,
  loadCloudSource,
  loadConfig,
  loadPlugins,
  parseEnvFile,
  parseEnvFileContent,
  runCheck,
  runGenerate,
  runValidationCommand,
  validateContract,
} from "@xlameiro/env-typegen";

const root = "/Users/xlameiro/Proyectos/env-typegen/qa-test";
const reportPath = path.join(
  root,
  "reports/programmatic-manual-2026-03-17.json",
);

/** @type {Array<{name:string,status:'pass'|'fail',details:string}>} */
const results = [];

async function runCase(name, fn) {
  try {
    const details = await fn();
    results.push({ name, status: "pass", details: String(details ?? "ok") });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    results.push({ name, status: "fail", details: message });
  }
}

await runCase("parseEnvFile", async () => {
  const parsed = parseEnvFile(path.join(root, ".env.example"));
  return `vars=${parsed.vars.length}`;
});

await runCase("parseEnvFileContent + inferType", async () => {
  const parsed = parseEnvFileContent(
    "A=1\nB=true\nC=https://a.com\n",
    "in-memory.env",
  );
  const inferred = inferType("EMAIL", "test@example.com");
  return `vars=${parsed.vars.length}, inferType=${inferred}`;
});

await runCase("generators", async () => {
  const parsed = parseEnvFile(path.join(root, ".env.example"));
  const a = generateTypeScriptTypes(parsed).length;
  const b = generateZodSchema(parsed).length;
  const c = generateT3Env(parsed).length;
  const d = generateDeclaration(parsed).length;
  return `sizes=${a}/${b}/${c}/${d}`;
});

await runCase("runGenerate", async () => {
  await runGenerate({
    input: path.join(root, ".env.example"),
    output: path.join(root, "outputs/programmatic-generated.ts"),
    generators: ["typescript"],
    format: true,
  });
  return "generated typescript file";
});

await runCase("defineConfig + loadConfig", async () => {
  const cfg = defineConfig({
    input: ".env.example",
    output: "outputs/x.ts",
    generators: ["typescript"],
  });
  const loaded = await loadConfig(root);
  return `defineConfig.generators=${cfg.generators?.join(",")}, loadConfig=${loaded ? "ok" : "none"}`;
});

await runCase("loadContract + validateContract + ci report", async () => {
  const contract = defineContract({
    vars: [
      { name: "DATABASE_URL", expectedType: "url", required: true },
      { name: "NODE_ENV", expectedType: "string", required: true },
    ],
  });

  const parsed = parseEnvFile(path.join(root, ".env"));
  const validationResult = validateContract(parsed, contract, {
    environment: path.join(root, ".env"),
    strict: true,
  });
  const ci = buildCiReport(validationResult, {
    env: path.join(root, ".env"),
    timestamp: new Date().toISOString(),
  });
  const ciJson = formatCiReport(ci, { pretty: false });
  return `issues=${validationResult.issues.length}, ciStatus=${ci.status}, ciLen=${ciJson.length}`;
});

await runCase("runCheck", async () => {
  const checkContractPath = path.join(root, "tmp-check.contract.mjs");
  await fs.writeFile(
    checkContractPath,
    [
      "export default {",
      "  vars: [",
      "    { name: 'DATABASE_URL', expectedType: 'url', required: true },",
      "    { name: 'NODE_ENV', expectedType: 'string', required: true },",
      "  ],",
      "};",
    ].join("\n"),
    "utf8",
  );

  const status = await runCheck({
    input: path.join(root, ".env.bad"),
    contract: checkContractPath,
    json: true,
    pretty: false,
    silent: true,
    cwd: root,
  });
  return `status=${status}`;
});

await runCase("runValidationCommand", async () => {
  const exitCode = await runValidationCommand({
    command: "diff",
    argv: [
      "--targets",
      `${path.join(root, ".env")},${path.join(root, ".env.staging")}`,
      "--contract",
      path.join(root, "env.contract.mjs"),
      "--json",
    ],
  });
  return `exitCode=${exitCode}`;
});

await runCase("loadCloudSource", async () => {
  const source = await loadCloudSource({
    provider: "aws",
    filePath: path.join(root, "cloud/aws-env.json"),
  });
  return `keys=${Object.keys(source).length}`;
});

await runCase("plugins API", async () => {
  const plugins = await loadPlugins({
    pluginPaths: [path.join(root, "plugins/qa-plugin-with-name.mjs")],
    cwd: root,
  });
  const source = applySourcePlugins(
    { environment: "manual", values: { A: "1" } },
    plugins,
  );
  const contract = applyContractPlugins(
    { schemaVersion: 1, variables: {} },
    plugins,
  );
  const report = applyReportPlugins(
    {
      schemaVersion: 1,
      status: "ok",
      summary: { errors: 0, warnings: 0, total: 0 },
      issues: [],
      meta: { env: "manual", timestamp: new Date().toISOString() },
    },
    plugins,
  );
  return `plugins=${plugins.length}, sourceKeys=${Object.keys(source).length}, contractVars=${Object.keys(contract.variables).length}, reportStatus=${report.status}`;
});

const summary = {
  total: results.length,
  passed: results.filter((item) => item.status === "pass").length,
  failed: results.filter((item) => item.status === "fail").length,
  generatedAt: new Date().toISOString(),
  results,
};

await fs.writeFile(reportPath, JSON.stringify(summary, null, 2), "utf8");

if (summary.failed > 0) {
  console.error(`PROGRAMMATIC_SMOKE_FAILED:${summary.failed}`);
  process.exit(1);
}

console.log(`PROGRAMMATIC_SMOKE_OK:${summary.passed}/${summary.total}`);
