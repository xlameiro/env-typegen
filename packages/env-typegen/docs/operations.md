## Operations Guide

Use this guide to run env-typegen governance commands reliably in local and CI environments.

### Command lifecycle

1. `pull` (read-only provider sync)
2. `diff` and `doctor` (drift diagnostics)
3. `verify` (blocking governance gate)
4. `plan` and `sync-preview` (read-only preflight)

### CI baseline

```bash
pnpm lint && pnpm type-check && pnpm test && pnpm build
env-typegen verify --env .env --contract env.contract.mjs --json=pretty --output-file reports/env-verify.json
```

### Smoke check

Run the repository smoke script before release:

```bash
node qa-test/env-typegen-governance-smoke.mjs
```

This script validates:

- passing and failing verify behavior
- pull command execution
- plan command execution
- sync-preview command execution

Report output:

- `qa-test/reports/env-governance-smoke.json`

### Troubleshooting quick checks

- Adapter load errors: validate module path and export shape.
- Verify failures: inspect JSON report issue classes.
- Sync-preview non-zero: expected when policy blocks drift.

### Safe defaults

- Keep outputs redacted in CI.
- Avoid `--debug-values` except local debugging.
- Keep provider operations read-only by default.
