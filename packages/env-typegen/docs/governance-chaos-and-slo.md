## Governance Chaos and SLO

Chaos and SLO checks provide runtime confidence that governance decisions remain safe under stress and degraded conditions.

## Resilience controls

- Chaos matrix tests for deterministic failure handling.
- SLO policy readiness classification (`healthy`, `degraded`, `breach`).
- Incident-aware throttling and promotion guards.
- Forensics correlation after resilience checks.

## Workflows and commands

- Chaos workflow: `.github/workflows/env-governance-chaos.yml`
- Forensics workflow: `.github/workflows/env-governance-forensics.yml`
- Promotion workflow: `.github/workflows/env-governance-promotion.yml`

```bash
node qa-test/env-typegen-chaos-smoke.mjs
node qa-test/env-typegen-forensics-smoke.mjs
node qa-test/env-typegen-governance-promotion-smoke.mjs
```

## Expected artifacts

- `qa-test/reports/env-governance-chaos-smoke.json`
- `qa-test/reports/env-governance-forensics-smoke.json`
- `qa-test/reports/env-governance-promotion-smoke.json`
