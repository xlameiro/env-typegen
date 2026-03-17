import { defineConfig } from "@xlameiro/env-typegen";

export default defineConfig({
  input: ["./.env.example"],
  output: "./outputs/config-generated.ts",
  generators: ["typescript", "zod"],
  strict: true,
  schemaFile: "./env.contract.mjs",
  diffTargets: ["./.env", "./.env.staging", "./.env.production"],
  plugins: ["./plugins/qa-plugin-valid.mjs"],
});
