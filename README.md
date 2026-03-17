# env-typegen

Generate TypeScript types, Zod schemas, t3-env configs, and declaration files from `.env.example`.

[![npm version](https://img.shields.io/npm/v/@xlameiro/env-typegen)](https://www.npmjs.com/package/@xlameiro/env-typegen)
[![CI](https://github.com/xlameiro/env-typegen/actions/workflows/ci.yml/badge.svg)](https://github.com/xlameiro/env-typegen/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

## Why this project

Keeping env types, runtime validation, and `@t3-oss/env-nextjs` config in sync by hand is repetitive and error-prone.
`env-typegen` turns a single `.env.example` file into typed artifacts you can use immediately.

## Quick Start

```bash
# Recommended: local dev dependency
pnpm add -D @xlameiro/env-typegen
# or: npm install --save-dev @xlameiro/env-typegen

# Generate all outputs (default): typescript + zod + t3 + declaration
npx env-typegen -i .env.example -o src/env.generated.ts

# Generate only Zod
npx env-typegen -i .env.example -o src/env.schema.ts -f zod

# Watch mode
npx env-typegen -i .env.example -o src/env.generated.ts --watch

# Validate one env source against a contract (strict by default)
npx env-typegen check --env .env --contract env.contract.ts
```

## Validation and governance

The package also supports contract-first validation workflows:

- `check` validates one source against a contract
- `diff` compares multiple sources and detects drift
- `doctor` combines validation and drift findings with recommendations

```bash
# Compare drift across common targets
npx env-typegen diff --targets .env,.env.example,.env.production --contract env.contract.ts

# Aggregated diagnostics
npx env-typegen doctor --env .env --targets .env,.env.example,.env.production --contract env.contract.ts

# CI-friendly JSON output
npx env-typegen check --env .env --json --output-file reports/env-check.json
```

### Cloud snapshots

You can add cloud sources directly in validation commands:

```bash
npx env-typegen check --cloud-provider vercel --cloud-file vercel-env.json --contract env.contract.ts
npx env-typegen diff --cloud-provider aws --cloud-file aws-env.json --contract env.contract.ts
```

Supported providers: `vercel`, `cloudflare`, `aws`.

### Plugins

Validation commands support a plugin system for transforming:

- contract (`transformContract`)
- source values (`transformSource`)
- final reports (`transformReport`)

Load plugins with `--plugin` flags or via `plugins` in `env-typegen.config.ts`.

## Generator formats

Use `-f`/`--format` (repeatable) to select outputs:

| Format value         | Output                                       |
| -------------------- | -------------------------------------------- |
| `ts` or `typescript` | TypeScript types (`EnvVars`)                 |
| `zod`                | Zod v4 schema                                |
| `t3`                 | `createEnv` config for `@t3-oss/env-nextjs`  |
| `declaration`        | `.d.ts` augmentation for `NodeJS.ProcessEnv` |

If you omit `-f`, env-typegen generates all four outputs by default.

## Example

Given `.env.example`:

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
DATABASE_URL=postgresql://localhost:5432/mydb
```

`env-typegen -i .env.example -o src/env.generated.ts -f ts` generates:

```ts
export type EnvVars = {
  NEXT_PUBLIC_APP_URL: string;
  DATABASE_URL: string;
};
```

## Monorepo structure

```text
packages/
  env-typegen/    # npm package and CLI source
app/              # Website/docs (Next.js)
```

## Documentation

- Package docs and full CLI/API reference: [`packages/env-typegen/README.md`](packages/env-typegen/README.md)
- Website docs (Fumadocs): [`content/docs/`](content/docs)
- Contribution guide: [`CONTRIBUTING.md`](CONTRIBUTING.md)
- Security policy: [`SECURITY.md`](SECURITY.md)

## Contributing

Contributions are welcome.

```bash
pnpm lint && pnpm type-check && pnpm test && pnpm build
```

Then open a pull request.

## License

MIT © [xlameiro](https://github.com/xlameiro)
