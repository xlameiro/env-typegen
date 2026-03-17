import { defineConfig } from "@xlameiro/env-typegen";

export default defineConfig({
  input: "../fixtures/basic.env.example",
  output: "outputs/single-config.ts",
  generators: ["typescript", "zod"],
  format: true,
});
