import { defineConfig } from "@xlameiro/env-typegen";

export default defineConfig({
  input: ".env.example",
  output: "outputs/env.generated.ts",
  generators: ["typescript", "zod"],
  format: true,
  schemaFile: "env.contract.mjs",
  strict: true,
  diffTargets: [".env", ".env.staging", ".env.example"],
});
