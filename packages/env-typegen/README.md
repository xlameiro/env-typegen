# env-typegen

> From `.env.example` to typed outputs and contract-based environment governance.
>
> If this package saves debugging time for your team, consider starring the repository.

[![npm version](https://badge.fury.io/js/%40xlameiro%2Fenv-typegen.svg)](https://npmjs.com/package/@xlameiro/env-typegen)
[![npm downloads](https://img.shields.io/npm/dm/@xlameiro/env-typegen)](https://npmjs.com/package/@xlameiro/env-typegen)
[![CI](https://github.com/xlameiro/env-typegen/actions/workflows/ci.yml/badge.svg)](https://github.com/xlameiro/env-typegen/actions/workflows/ci.yml)
[![GitHub stars](https://img.shields.io/github/stars/xlameiro/env-typegen?style=social)](https://github.com/xlameiro/env-typegen/stargazers)
[![Maintainer](https://img.shields.io/badge/maintainer-xlameiro-0ea5e9)](https://github.com/xlameiro)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## What this package does

`@xlameiro/env-typegen` reads `.env.example` and helps you:

- generate TypeScript, Zod, t3-env, and declaration outputs
- validate real env files against explicit contracts
- detect drift across multiple targets
- produce CI-friendly JSON diagnostics

## Installation

```bash
pnpm add -D @xlameiro/env-typegen
# or
npm install --save-dev @xlameiro/env-typegen
```

## Quick Start

```bash
# Generate all outputs by default
npx env-typegen --input .env.example --output src/env.generated.ts

# Generate only Zod schema
npx env-typegen -i .env.example -o src/env.schema.ts -g zod

# Watch mode
npx env-typegen -i .env.example -o src/env.generated.ts --watch
```

## Generator formats

| Value                | Output                                       |
| -------------------- | -------------------------------------------- |
| `ts` or `typescript` | TypeScript env types                         |
| `zod`                | Zod v4 schema                                |
| `t3`                 | `@t3-oss/env-nextjs` `createEnv(...)` config |
| `declaration`        | Ambient `.d.ts` env declaration              |

Multiple outputs in one run:

```bash
npx env-typegen -i .env.example -o src/env.ts -f typescript -f zod -f declaration
```

## Validation and governance commands

```bash
# Validate one source
npx env-typegen check --env .env --contract env.contract.ts

# Compare drift across sources
npx env-typegen diff --targets .env,.env.example,.env.production --contract env.contract.ts

# Aggregated diagnostics
npx env-typegen doctor --env .env --targets .env,.env.example,.env.production --contract env.contract.ts
```

JSON output for CI:

```bash
npx env-typegen check --env .env --json --output-file reports/env-check.json
```

Strict mode is enabled by default. Use `--no-strict` to downgrade undeclared variables to warnings.

## Cloud snapshots

Validation commands can include cloud snapshot sources:

```bash
npx env-typegen check --cloud-provider vercel --cloud-file vercel-env.json --contract env.contract.ts
npx env-typegen diff --cloud-provider cloudflare --cloud-file cloudflare-env.json --contract env.contract.ts
npx env-typegen doctor --cloud-provider aws --cloud-file aws-env.json --contract env.contract.ts
```

Supported providers: `vercel`, `cloudflare`, `aws`.

## Plugin hooks

Use plugins to customize validation behavior:

- `transformContract`
- `transformSource`
- `transformReport`

Load plugins with repeated `--plugin` flags or via `plugins` in `env-typegen.config.ts`.

## Programmatic API

```ts
import {
  runGenerate,
  runValidationCommand,
  parseEnvFile,
  generateTypeScriptTypes,
  loadCloudSource,
  loadPlugins,
} from "@xlameiro/env-typegen";
```

## Typical adoption path

1. Start with generation-only output (`ts`, `zod`).
2. Add `check` in CI for contract enforcement.
3. Add `diff` and `doctor` for drift prevention.
4. Add cloud snapshots and plugins for advanced workflows.

## FAQ

### Is this package only for Next.js?

No. It is framework-agnostic. The `t3` generator is optional.

### Can I use it without a contract file?

Yes, but explicit contracts are recommended for governance and CI reliability.

### Which command should I run in CI?

Start with `check`. Add `diff` or `doctor` as your pipeline maturity grows.

## Docs and references

- Website docs source: [`/content/docs`](../../content/docs)
- Package docs index: [`/packages/env-typegen/docs`](./docs)
- Changelog: [`CHANGELOG.md`](./CHANGELOG.md)

## Trust signals

- Maintained by [@xlameiro](https://github.com/xlameiro)
- Security policy: [`SECURITY.md`](../../SECURITY.md)
- Contribution guide: [`CONTRIBUTING.md`](../../CONTRIBUTING.md)
- Published releases: [npm package page](https://www.npmjs.com/package/@xlameiro/env-typegen)

## Status

`env-typegen` is actively maintained and published on npm.

## License

MIT
