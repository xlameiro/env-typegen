---
"@xlameiro/env-typegen": patch
---

Fix six QA-identified deficiencies in CLI behaviour and documentation

- **D1 (critical)**: Fix crash when `.ts` config file is present — `loadConfig()` now throws an actionable error with a code snippet instead of silently failing. `CONFIG_FILE_NAMES` load order changed to `.mjs → .js → .ts` to prefer simpler formats first.
- **D2**: Document multi-generator output suffix convention in `--output` / `-o` help text (e.g. `env.generated.typescript.ts`, `env.generated.zod.ts`).
- **D3**: Add "Config file:" section to `--help` describing auto-discovery order (`.mjs → .js → .ts`), CLI flag override, and `defineConfig()` tip.
- **D4**: Expand plugin load error to include the full expected interface shape (`name`, `transformSource?`, `transformReport?`, `transformContract?`) so users know exactly what to export.
- **D5**: Add "Exit codes:" section to all four help texts (`generate`, `check`, `diff`, `doctor`).
- **D6**: Fix `--watch` mode not propagating `output` path changes when config is reloaded — `handleConfigChange` now updates `runOptions.output` alongside `generators`, `format`, and `inferenceRules`.
