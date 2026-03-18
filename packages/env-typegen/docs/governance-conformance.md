## Governance Conformance

Conformance gates ensure adapter behavior and orchestration outcomes stay deterministic across repositories.

## What conformance validates

- Adapter contract v3 metadata and capability declarations.
- Push result shape consistency (including failure kinds).
- Bounded orchestration strategy behavior (`fail-fast`, `fail-late`).
- Deterministic smoke report generation.

## Commands

```bash
node qa-test/env-typegen-conformance-smoke.mjs
node qa-test/env-typegen-governance-promotion-smoke.mjs
```

## CI workflows

- `.github/workflows/env-governance-conformance.yml`
- `.github/workflows/env-governance-promotion.yml`

## Multi-repo bootstrap

Fleet manifest fields:

- `id`
- `repository`
- `root`
- `provider`
- `environment`
- `stage`

Governance stages:

1. `advisory-enforce`
2. `enforce`
3. `apply`

## Artifacts

- `qa-test/reports/env-governance-conformance-smoke.json`
- `qa-test/reports/env-governance-promotion-smoke.json`

Review these artifacts before promoting repository stages.
