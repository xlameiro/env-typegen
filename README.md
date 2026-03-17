# env-typegen

Generate typed environment artifacts and enforce environment contracts from one source of truth.

[![npm version](https://img.shields.io/npm/v/@xlameiro/env-typegen)](https://www.npmjs.com/package/@xlameiro/env-typegen)
[![CI](https://github.com/xlameiro/env-typegen/actions/workflows/ci.yml/badge.svg)](https://github.com/xlameiro/env-typegen/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

## Why env-typegen

Teams often keep `.env.example`, runtime validation, and TypeScript types in separate places.
That creates drift, hidden deploy risk, and repetitive maintenance.

`env-typegen` solves this by:

- generating typed outputs from `.env.example`
- validating real environment sources against explicit contracts
- detecting drift across local and cloud snapshots
- exporting machine-readable diagnostics for CI gates

## What it can do

| Capability                    | Outcome                                      |
| ----------------------------- | -------------------------------------------- |
| Generate TypeScript (`ts`)    | Compile-time env typing                      |
| Generate Zod (`zod`)          | Runtime validation schema                    |
| Generate `t3` output          | `@t3-oss/env-nextjs` config scaffold         |
| Generate `declaration` output | `NodeJS.ProcessEnv` augmentation             |
| `check` command               | Contract validation of one source            |
| `diff` command                | Drift analysis across multiple sources       |
| `doctor` command              | Consolidated diagnostics and recommendations |
| Cloud snapshot support        | Vercel, Cloudflare, AWS parity checks        |
| Plugin hooks                  | Extend contract/source/report behavior       |

## Quick start

```bash
# Install as a dev dependency
pnpm add -D @xlameiro/env-typegen

# Generate all outputs (typescript + zod + t3 + declaration)
npx env-typegen -i .env.example -o src/env.generated.ts

# Validate one env source against a contract
npx env-typegen check --env .env --contract env.contract.ts
```

## Governance workflow commands

```bash
# Compare drift across environments
npx env-typegen diff --targets .env,.env.example,.env.production --contract env.contract.ts

# Aggregated diagnostics
npx env-typegen doctor --env .env --targets .env,.env.example,.env.production --contract env.contract.ts

# CI-friendly JSON output
npx env-typegen check --env .env --json --output-file reports/env-check.json
```

## Common use cases

- Standardize env contracts across multiple apps in a monorepo.
- Block pull requests when required variables are missing or mistyped.
- Detect deployment drift between staging and production.
- Keep TypeScript, Zod, and runtime env configuration in sync.

## Comparison: manual approach vs env-typegen

| Scenario               | Manual approach              | env-typegen                   |
| ---------------------- | ---------------------------- | ----------------------------- |
| Keep env types updated | Hand-maintained, error-prone | Generated from `.env.example` |
| Runtime checks         | Ad-hoc or inconsistent       | Contract-first commands       |
| Drift detection        | Usually custom scripts       | Built-in `diff` + `doctor`    |
| CI reporting           | Hard to standardize          | JSON output for automation    |

## Documentation map

- Website docs: [`/content/docs`](content/docs)
- Package docs: [`packages/env-typegen/README.md`](packages/env-typegen/README.md)
- Website route: `/docs/getting-started`
- Website route: `/docs/validation`
- Website route: `/docs/api`

## LLM and crawler discoverability

- [`llms.txt`](llms.txt): concise capability and navigation index for LLM crawlers
- [`llms-full.txt`](llms-full.txt): expanded, task-oriented map for agentic consumers

## Contributing

Contributions are welcome.

```bash
pnpm lint && pnpm type-check && pnpm test && pnpm build
```

Then open a pull request.

## License

MIT © [xlameiro](https://github.com/xlameiro)
