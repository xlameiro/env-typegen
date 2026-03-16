## Programmatic API

```typescript
import {
  parseEnvFile,
  parseEnvFileContent,
  inferType,
  inferTypes,
  generateTypeScriptTypes,
  generateZodSchema,
  generateT3Env,
  generateDeclaration,
  runGenerate,
} from "@xlameiro/env-typegen";
```

### Key APIs

- `parseEnvFile(path)` — reads a `.env.example` file from disk; returns a `ParsedEnvFile`
- `parseEnvFileContent(content, filePath?)` — parses raw string content; useful in tests or pipelines
- `inferType(key, value, options?)` — infers `EnvVarType` from a key+value pair
- `inferTypes(parsed)` — runs inference for all variables in a `ParsedEnvFile`
- `generateTypeScriptTypes(parsed)` — produces a `type Env = { ... }` TypeScript declaration
- `generateZodSchema(parsed)` — produces a Zod v4 `z.object({ ... })` schema
- `generateT3Env(parsed)` — produces a `@t3-oss/env-nextjs` `createEnv(...)` call
- `generateDeclaration(parsed)` — produces a `.d.ts` file augmenting `NodeJS.ProcessEnv`
- `runGenerate(options)` — orchestrates the full pipeline (parse → infer → generate → write)
