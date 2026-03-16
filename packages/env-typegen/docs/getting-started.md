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
