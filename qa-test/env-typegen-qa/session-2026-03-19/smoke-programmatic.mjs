import { defineConfig, runGenerate } from "@xlameiro/env-typegen";

await runGenerate({
  input: "fixtures/basic.env.example",
  output: "outputs/prog.ts",
  generators: ["typescript"],
  format: false,
});

const config = defineConfig({ input: "fixtures/basic.env.example" });

console.assert(
  config.input === "fixtures/basic.env.example",
  "defineConfig passthrough",
);
