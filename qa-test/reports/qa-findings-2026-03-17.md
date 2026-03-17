# QA report - env-typegen (2026-03-17)

## Scope covered

- Install package in workspace root: `pnpm add -w @xlameiro/env-typegen`
- CLI discovery: `--help`, `--version`, `check --help`, `diff --help`, `doctor --help`
- Generate command flags tested:
  - `-i/--input`, `-o/--output`, `-f/--format`, `-g/--generator`
  - `--stdout`, `--dry-run`, `--no-format`, `-s/--silent`, `-c/--config`, `--watch`
- Validation command flags tested (`check`, `diff`, `doctor`):
  - `--env`, `--targets`, `--contract`, `--example`
  - `--strict`, `--no-strict`
  - `--json`, `--json=pretty`, `--output-file`, `--debug-values`
  - `--cloud-provider`, `--cloud-file`
  - `--plugin`

Evidence files:

- `qa-test/reports/qa-cli-2026-03-17.log`
- `qa-test/reports/qa-cli-2026-03-17-abs.log`
- `qa-test/reports/qa-cli-extra-2026-03-17.log`
- `qa-test/reports/qa-plugin-with-name.log`

## Findings for improvement

1. **Inconsistent CLI usage docs for `generate`**

- Observed: help says `env-typegen [generate] ...` but explicit `generate` fails as unexpected positional arg.
- Evidence: `qa-test/reports/qa-cli-2026-03-17.log` lines 10-13.
- Recommendation: either support explicit `generate` subcommand or update usage/help text to remove `[generate]`.

2. **Multi-input generation can collide output filenames**

- Observed: with two absolute input paths, both generated into the same target `outputs/.env.ts` (second write overwrites first).
- Evidence: `qa-test/reports/qa-cli-2026-03-17-abs.log` lines 15-19.
- Recommendation: derive output suffix from full basename safely (for example `env-example.ts`, `env-extra.ts`) or preserve parent folder context to avoid collisions.

3. **Plugin contract requirement is under-documented (`name` is required)**

- Observed: plugin without `name` is rejected as invalid; same plugin with `name` works.
- Evidence:
  - Invalid: `qa-test/reports/qa-cli-2026-03-17-abs.log` lines 81-89.
  - Valid with name: `qa-test/reports/qa-plugin-with-name.log` line 2.
- Recommendation: document `name` as mandatory in README/docs plugin section and add a minimal working plugin example.

4. **Duplicate keys in .env are not surfaced as explicit diagnostics**

- Observed: `.env.dup` with duplicated `PORT` did not produce a duplicate-key issue; report only shows missing/extra contract issues.
- Evidence: `qa-test/reports/qa-cli-extra-2026-03-17.log` starts at line 2.
- Recommendation: add parser warning/error code for duplicated keys (for example `ENV_DUPLICATE_KEY`) with line numbers.

5. **First-run UX can be confusing with relative paths in monorepo contexts**

- Observed: when cwd is not the fixture folder, relative paths fail silently into "file not found" behavior.
- Evidence: `qa-test/reports/qa-cli-2026-03-17.log` lines 111-118 and similar.
- Recommendation: include `cwd` in error output or suggest resolved absolute path in diagnostics.

## Expected failures (not bugs)

- Invalid env values in `.env.bad` correctly fail with typed diagnostics.
- `--no-strict` correctly downgrades extras to warnings while keeping required/missing as errors.
- Unknown cloud provider correctly fails with validation error.
- Cloud snapshots correctly detect contract drift/extras.

## Notes

- `--watch` was validated manually and regenerates outputs on change.
- JSON report persistence with `--output-file` works and creates missing output directories when needed.

## Coverage completion update (full surface)

Additional execution completed to satisfy full coverage of the tool surface (manual + programmatic):

- Existing automated suite (programmatic) executed from package:
  - `packages/env-typegen`: **28 files / 411 tests passing**.
- Manual CLI gap coverage executed and logged:
  - `qa-test/reports/qa-cli-gaps-2026-03-17.log`
  - `qa-test/reports/qa-cli-gaps-2026-03-17-retest.log`
- Manual programmatic API smoke executed and logged:
  - `qa-test/reports/programmatic-manual-2026-03-17.json` (**10/10 pass**)

### CLI options explicitly covered in the gap run

- `check`: `--example`, explicit `--strict`, `-c/--config`, `--cloud-provider cloudflare` + `--cloud-file`, repeatable `--plugin`.
- `diff`: `--example`, explicit `--strict`, `--debug-values`, `-c/--config`, repeatable `--plugin`.
- `doctor`: `--example`, explicit `--strict`, `--debug-values`, `-c/--config`, repeatable `--plugin`.

### Programmatic API manually exercised

- Parsing and inference: `parseEnvFile`, `parseEnvFileContent`, `inferType`.
- Generators: `generateTypeScriptTypes`, `generateZodSchema`, `generateT3Env`, `generateDeclaration`.
- Pipeline/config: `runGenerate`, `defineConfig`, `loadConfig`.
- Validation/reporting: `defineContract`, `validateContract`, `buildCiReport`, `formatCiReport`, `runCheck`, `runValidationCommand`.
- Integrations/extensions: `loadCloudSource`, `loadPlugins`, `applySourcePlugins`, `applyContractPlugins`, `applyReportPlugins`.

Result: full CLI option surface and main public programmatic API surface were executed with real runs and persisted evidence.
