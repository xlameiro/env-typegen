## Configuration

Create `env-typegen.config.ts`:

```typescript
import { defineConfig } from "@xlameiro/env-typegen";

export default defineConfig({
  input: ".env.example",
  output: "env.generated.ts",
  generators: ["typescript", "zod"],
  format: true,
  schemaFile: "env.contract.ts",
  strict: true,
  diffTargets: [".env", ".env.example", ".env.production"],
  plugins: ["./plugins/custom-validator.ts"],
});
```

CLI flags override config values when both are provided.
