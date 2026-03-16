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
```

## Generator formats

Use `-f` / `--format` (or `-g` / `--generator` alias):

| Value                | Meaning                              |
| -------------------- | ------------------------------------ |
| `ts` or `typescript` | Generate TypeScript types            |
| `zod`                | Generate Zod schema                  |
| `t3`                 | Generate `@t3-oss/env-nextjs` config |
| `declaration`        | Generate `.d.ts` declaration         |

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
