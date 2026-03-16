## Configuration

Create `env-typegen.config.ts`:

```typescript
import { defineConfig } from "@xlameiro/env-typegen";

export default defineConfig({
  input: ".env.example",
  output: "env.generated.ts",
  generators: ["typescript", "zod"],
  format: true,
});
```

CLI flags override config values when both are provided.
