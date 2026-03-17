// env-typegen.config.ts — archivo de TypeScript que NO debe ser cargable en runtime
// QA-CASE: el CLI debe emitir error descriptivo al encontrar este archivo .ts
// y sugerir renombrarlo a .mjs
import { defineConfig } from "@xlameiro/env-typegen";

export default defineConfig({
  input: "./.env.example",
  output: "./outputs/from-ts-config.ts",
});
