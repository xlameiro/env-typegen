## Generators

- `ts` (`typescript`): TypeScript env types and `ProcessEnv` namespace augmentation.
- `zod`: Zod schema output split into server/client schemas.
- `t3`: `@t3-oss/env-nextjs` `createEnv` output.
- `declaration`: ambient `.d.ts` declaration output.

You can pass multiple formats:

```bash
env-typegen -i .env.example -o env.generated.ts -f ts -f zod
```
