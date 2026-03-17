// env-typegen.config.mjs — runtime config para QA de precedencia CLI vs config
// NOTA: contiene generators y output que deben ser OVERRIABLES por CLI flags.
import { defineConfig } from "@xlameiro/env-typegen";

export default defineConfig({
  input: "./.env.example",
  output: "./outputs/from-config.ts",
  generators: ["typescript"],
  format: false,
});
