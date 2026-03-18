## Configuration

Create `env-typegen.config.mjs`:

```typescript
import { defineConfig } from "@xlameiro/env-typegen";

export default defineConfig({
  input: ".env.example",
  output: "env.generated.ts",
  generators: ["typescript", "zod"],
  format: true,
  schemaFile: "env.contract.mjs",
  strict: true,
  diffTargets: [".env", ".env.example", ".env.production"],
  plugins: ["./plugins/custom-validator.mjs"],
});
```

CLI flags override config values when both are provided.

When `--contract` is omitted, env-typegen auto-discovers `env.contract.mjs` or `env.contract.js`.
