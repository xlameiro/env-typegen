## Feature Name

Product Governance Upgrade for env-typegen

## Current status

- Phase 1 baseline delivered and validated.
- Phase 3 continuation roadmap published in [docs/roadmap/infra-governance-part3-roadmap.md](./infra-governance-part3-roadmap.md).
- Phase 4 roadmap published in [docs/roadmap/infra-governance-part4-roadmap.md](./infra-governance-part4-roadmap.md).
- Phase 5 roadmap published in [docs/roadmap/infra-governance-part5-roadmap.md](./infra-governance-part5-roadmap.md).
- Phase 6 roadmap published in [docs/roadmap/infra-governance-part6-roadmap.md](./infra-governance-part6-roadmap.md).
- Phase 7 roadmap published in [docs/roadmap/infra-governance-part7-roadmap.md](./infra-governance-part7-roadmap.md).
- Operations runbook available for execution teams in [content/docs/operations.mdx](../../content/docs/operations.mdx).
- Conformance guide available for platform rollouts in [content/docs/governance-conformance.mdx](../../content/docs/governance-conformance.mdx).

## Phase 1 Goals

- Extend config shape for governance use-cases without breaking current CLI flows.
- Introduce adapter contracts as the foundation for provider integrations.
- Add a dynamic adapter loader so runtime integrations remain decoupled from core.
- Capture rollout intent, constraints, and quality criteria in a durable roadmap.

## Scope Implemented in Phase 1

- Modified [packages/env-typegen/src/config.ts](../../packages/env-typegen/src/config.ts) with foundational governance types:
  - `version`
  - `environments`
  - `providers`
  - `rules`
- Added [packages/env-typegen/src/adapters/types.ts](../../packages/env-typegen/src/adapters/types.ts)
  defining adapter contracts and capabilities.
- Added [packages/env-typegen/src/adapters/loader.ts](../../packages/env-typegen/src/adapters/loader.ts)
  for dynamic runtime adapter loading.

## Guardrails

- Backward compatibility is mandatory for current `generate`, `check`, `diff`, and `doctor` users.
- No provider-specific logic inside core validation or generation layers in Phase 1.
- Zero-leak posture is part of the adapter contract (`redactValuesByDefault`).

## Quality Gate for Each Phase

Run and keep green before promotion:

```bash
pnpm lint
pnpm type-check
pnpm test
pnpm build
```

## Phase 2 Scope (Planned)

- Add `pull` and `verify` command surfaces in CLI.
- Reuse validation engine for deterministic CI gating.
- Introduce a unified drift report formatter for human and JSON outputs.

## Delivery Notes

- Phase boundaries are strict to avoid scope creep.
- No Phase 2 implementation should start until Phase 1 quality gate is fully green.

## Ratified Governance Decisions (Open Questions Closed)

- Verify scope: mandatory for PRs and protected branches. In feature branches, warnings may remain non-blocking, but PRs to `main` and `main` itself must fail on critical inconsistencies.
- Vercel resilience: include a basic retry strategy for transient `429` and `5xx` responses (simple exponential backoff, three attempts). Advanced enterprise queueing/rate strategies are deferred to Phase 8.
- Docker scope: v1 remains focused on literal values only. Advanced shell interpolation is out of scope.
- Sync policy: strict read-only posture remains in place until a dedicated push RFC is approved with audit, confirmation, and dry-run safeguards.

## Phase 11 operational packaging

- Smoke command: `node qa-test/env-typegen-governance-smoke.mjs`
- Smoke CI workflow: `.github/workflows/env-governance-smoke.yml`
- Package consumer operations guide: `packages/env-typegen/docs/operations.md`

## Phase 16 apply rollout

- Apply dry-run workflow: `.github/workflows/env-governance-apply-dry-run.yml`
- Apply workflow: `.github/workflows/env-governance-apply.yml`
- Apply smoke command: `node qa-test/env-typegen-apply-smoke.mjs --mode=all`
- Website docs: `content/docs/policy-packs.mdx`, `content/docs/sync-apply.mdx`
- Package docs: `packages/env-typegen/docs/policy-packs.md`, `packages/env-typegen/docs/sync-apply.md`

Phase 11 exit criteria:

- Workspace health check passes (`pnpm lint && pnpm type-check && pnpm test && pnpm build`).
- Governance smoke report artifact is generated consistently at `qa-test/reports/env-governance-smoke.json`.

Phase 16 exit criteria:

- Apply dry-run and apply workflows execute deterministic pass/fail flows.
- Apply smoke report artifact is generated at `qa-test/reports/env-governance-apply-smoke.json`.

## Phase 21 promotion rollout

- Promotion workflow: `.github/workflows/env-governance-promotion.yml`
- Promotion smoke command: `node qa-test/env-typegen-governance-promotion-smoke.mjs`
- Promotion smoke artifact: `qa-test/reports/env-governance-promotion-smoke.json`

Phase 21 exit criteria:

- Staged governance promotion gates (`advisory-enforce` -> `enforce` -> `apply`) are deterministic in CI.
- Sync-apply JSON output includes normalized governance summary for machine consumption.

## Phase 22 documentation closure

- Website promotion guide: `content/docs/governance-promotion.mdx`
- Package promotion guide: `packages/env-typegen/docs/governance-promotion.md`
- Part 5 roadmap: `docs/roadmap/infra-governance-part5-roadmap.md`

Phase 22 exit criteria:

- Root/package/site docs are aligned on promotion model and runbooks.
- Workspace quality gate remains green (`pnpm lint && pnpm type-check && pnpm test && pnpm build`).

## Phase 27 conformance rollout

- Conformance workflow: `.github/workflows/env-governance-conformance.yml`
- Conformance smoke command: `node qa-test/env-typegen-conformance-smoke.mjs`
- Conformance smoke artifact: `qa-test/reports/env-governance-conformance-smoke.json`

Phase 27 exit criteria:

- Adapter contract v3 checks pass deterministically in CI.
- Sync-apply bounded orchestration checks (`fail-fast` and `fail-late`) pass in smoke coverage.

## Phase 28 multi-repo bootstrap closure

- Fleet manifest parser: `packages/env-typegen/src/multi-repo/repo-manifest.ts`
- Bootstrap plan generator: `packages/env-typegen/src/multi-repo/bootstrap.ts`
- Fleet fixtures/tests: `packages/env-typegen/tests/multi-repo/`
- Website conformance guide: `content/docs/governance-conformance.mdx`
- Package conformance guide: `packages/env-typegen/docs/governance-conformance.md`
- Part 6 roadmap: `docs/roadmap/infra-governance-part6-roadmap.md`

Phase 28 exit criteria:

- Multi-repo bootstrap manifest validation passes for valid and invalid fixtures.
- Root/package/site docs are synchronized on conformance and staged rollout guidance.
- Workspace quality gate remains green (`pnpm lint && pnpm type-check && pnpm test && pnpm build`).

## Phase 34 CI and documentation closure

- Forensics workflow: `.github/workflows/env-governance-forensics.yml`
- Forensics smoke command: `node qa-test/env-typegen-forensics-smoke.mjs`
- Forensics smoke artifact: `qa-test/reports/env-governance-forensics-smoke.json`

Phase 34 exit criteria:

- Promotion/apply workflows assert trust and forensics integrity with deterministic reports.
- Root/package/site docs are aligned on trust model, chaos+SLO guidance, and forensics runbooks.
- Workspace quality gate remains green (`pnpm lint && pnpm type-check && pnpm test && pnpm build`).
