## Governance Promotion

Use staged promotion to roll out governance safely across repositories.

## Stage sequence

1. `advisory-enforce`: validate governance behavior and artifacts.
2. `enforce`: require deterministic verify and dry-run outcomes.
3. `apply`: enable guarded write path only in controlled contexts.

## Required commands

```bash
node qa-test/env-typegen-governance-smoke.mjs
node qa-test/env-typegen-apply-smoke.mjs --mode=all
node qa-test/env-typegen-governance-promotion-smoke.mjs
```

## Required workflows

- `.github/workflows/env-governance-smoke.yml`
- `.github/workflows/env-governance-apply-dry-run.yml`
- `.github/workflows/env-governance-apply.yml`
- `.github/workflows/env-governance-promotion.yml`

## Promotion artifact

- `qa-test/reports/env-governance-promotion-smoke.json`

## Multi-repo adoption checklist

- Enforce `verify` in PR and protected branch pipelines.
- Keep policy-pack precedence consistent (`inline` > `overlay` > `base`).
- Keep apply disabled until enforce stage has stable evidence.
- Require preflight and protected-branch guards before apply execution.

## Failure triage

- Identify failing stage in promotion report.
- Re-run corresponding smoke command locally.
- Fix guard/policy/workflow mismatch before re-enabling stage progression.
