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
```

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
