import { defineConfig } from "@xlameiro/env-typegen";

export default defineConfig({
  input: "../fixtures/types.env.example",
  output: "../outputs/types-custom.ts",
  generators: ["typescript"],
  format: true,
  inferenceRules: [
    {
      id: "custom_port_string",
      priority: 1,
      match: (key) => key === "PORT",
      type: "string",
    },
  ],
});
