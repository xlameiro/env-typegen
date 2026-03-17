## Getting Started

### Installation

```bash
pnpm add -D @xlameiro/env-typegen
```

### Basic usage

```bash
env-typegen --input .env.example --output env.generated.ts --format ts
```

### Generate multiple outputs

```bash
env-typegen -i .env.example -o env.generated.ts -f ts -f zod -f t3 -f declaration
```

When multiple formats are specified, each generator writes a separate file:
`env.generated.typescript.ts`, `env.generated.zod.ts`, `env.generated.t3.ts`, `env.generated.d.ts`.

### Watch mode

```bash
env-typegen -i .env.example -o env.generated.ts -f ts --watch
```

### Validate envs against contract

```bash
# Validate one environment file
env-typegen check --env .env --contract env.contract.ts

# Compare drift across environments
env-typegen diff --targets .env,.env.example,.env.production --contract env.contract.ts

# Aggregate and prioritize diagnostics
env-typegen doctor --env .env --targets .env,.env.example,.env.production --contract env.contract.ts
```

### JSON output for CI

```bash
env-typegen check --env .env --json --output-file reports/env-check.json
```

All command paths are resolved from the current working directory where you run `env-typegen`.
