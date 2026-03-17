import { defineConfig } from "@xlameiro/env-typegen";

export default defineConfig({
  input: "fixtures/basic.env.example",
  output: "outputs/from-config.ts",
  generators: ["typescript"],
  format: true,
});
