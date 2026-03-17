# env-typegen

> From `.env.example` to TypeScript in one command.

[![npm version](https://badge.fury.io/js/%40xlameiro%2Fenv-typegen.svg)](https://npmjs.com/package/@xlameiro/env-typegen)
[![CI](https://github.com/xlameiro/env-typegen/actions/workflows/ci.yml/badge.svg)](https://github.com/xlameiro/env-typegen/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://www.typescriptlang.org/)

## What it does

`env-typegen` reads `.env.example` files and automatically generates:

- TypeScript types (`type EnvVars = { PORT: number; DATABASE_URL: string }`)
- Zod v4 schemas (`z.object({ PORT: z.coerce.number() })`)
- `@t3-oss/env-nextjs` `createEnv` configuration
- `.d.ts` declaration files that augment `NodeJS.ProcessEnv`

## Install

```bash
pnpm add -D @xlameiro/env-typegen
# or
npm install --save-dev @xlameiro/env-typegen
```

## Quick Start

```bash
# Generate all outputs (default: typescript + zod + t3 + declaration)
npx env-typegen --input .env.example --output src/env.generated.ts

# Generate only a Zod schema
npx env-typegen -i .env.example -o src/env.schema.ts -g zod

# Generate multiple outputs explicitly
npx env-typegen -i .env.example -o src/env.ts -f typescript -f zod

# Generate without running Prettier
npx env-typegen -i .env.example -o src/env.ts --no-format

# Watch mode — regenerate on every change
npx env-typegen -i .env.example -o src/env.ts --watch

# Validate one env source against a contract (strict by default)
npx env-typegen check --env .env --contract env.contract.ts

# Compare drift across multiple env files
npx env-typegen diff --targets .env,.env.example,.env.production --contract env.contract.ts

# Full diagnostics (check + diff + recommendations)
npx env-typegen doctor --env .env --targets .env,.env.example,.env.production --contract env.contract.ts

# Machine-readable report for CI pipelines
npx env-typegen check --env .env --json --output-file reports/env-check.json
```

All paths (`--env`, `--contract`, `--targets`, and `--output-file`) are resolved from your current working directory.

## Generator formats

Use `-f` / `--format` (or `-g` / `--generator` alias):

| Value                | Meaning                              |
| -------------------- | ------------------------------------ |
| `ts` or `typescript` | Generate TypeScript types            |
| `zod`                | Generate Zod schema                  |
| `t3`                 | Generate `@t3-oss/env-nextjs` config |
| `declaration`        | Generate `.d.ts` declaration         |

## Validation commands

`env-typegen` also includes governance-focused commands:

- `check` — validates one env source against the contract
- `diff` — compares env sources and detects configuration drift
- `doctor` — aggregates findings and prints remediation suggestions

### Strict mode

- Strict mode is enabled by default for validation commands.
- Use `--no-strict` to downgrade undeclared variables to warnings.

### JSON output

- `--json` outputs compact JSON
- `--json=pretty` outputs formatted JSON
- `--output-file <path>` writes the JSON report to disk

## Programmatic API

```ts
import { runGenerate, parseEnvFile, generateTypeScriptTypes } from "@xlameiro/env-typegen";

// High-level: full pipeline
await runGenerate({
  input: ".env.example",
  output: "src/env.generated.ts",
  generators: ["typescript"],
  format: true,
});

// Low-level: parse then generate individually
const parsed = parseEnvFile(".env.example");
const ts = generateTypeScriptTypes(parsed);
```

## Configuration

Create `env-typegen.config.ts` at your project root:

```ts
import { defineConfig } from "@xlameiro/env-typegen";

export default defineConfig({
  input: ".env.example",
  output: "src/env.generated.ts",
  generators: ["typescript", "zod"],
  format: true,
});
```

## Status

`env-typegen` is actively maintained and published on npm.

## Changelog

See [`CHANGELOG.md`](./CHANGELOG.md) for release notes.

## License

MIT
