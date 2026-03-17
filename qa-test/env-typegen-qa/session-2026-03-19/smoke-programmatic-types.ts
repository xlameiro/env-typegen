import type {
  EnvTypegenConfig,
  RunGenerateOptions,
} from "@xlameiro/env-typegen";

const configCheck: EnvTypegenConfig = {
  input: "fixtures/basic.env.example",
};

const optionsCheck: RunGenerateOptions = {
  input: "fixtures/basic.env.example",
  output: "outputs/prog.ts",
  generators: ["typescript"],
  format: false,
};

export const typeChecks = {
  configCheck,
  optionsCheck,
};
