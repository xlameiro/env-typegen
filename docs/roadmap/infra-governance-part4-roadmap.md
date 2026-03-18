## Infra Governance Part 4 Roadmap

## Objective

Enable controlled enterprise sync with explicit write guardrails, policy-pack governance,
and audit-ready CI workflows while preserving read-only defaults.

## Scope

- Deterministic apply preconditions and write safety checks.
- Controlled `sync-apply` rollout with dry-run-first workflows.
- Policy-pack documentation and federated governance guidance.
- Operations runbooks for apply incidents and audit evidence.

## Phase plan

### Phase 12 — Change-set and write-guard foundation

- Canonical change-set model shared by `plan` and `sync-preview`.
- Guardrail evaluation for protected environments and preflight checks.

Exit criteria:

- `pnpm --filter @xlameiro/env-typegen lint`
- `pnpm --filter @xlameiro/env-typegen type-check`
- `pnpm --filter @xlameiro/env-typegen test`
- `pnpm --filter @xlameiro/env-typegen build`

### Phase 13 — Controlled apply and audit trail

- `sync-apply` command with explicit dry-run/apply modes.
- Structured audit events and JSONL audit writer.

Exit criteria:

- Apply blocked when preconditions are missing.
- Audit output generated without secret leakage.

### Phase 14 — Policy packs and federated governance

- Base/overlay policy packs with deterministic precedence.
- Validation integration using resolved pack policy.

Exit criteria:

- Deterministic `verify` behavior with and without packs.
- Pack fixture coverage for precedence edge cases.

### Phase 15 — AWS adapters and contract hardening

- First-party AWS SSM and Secrets Manager adapters.
- Adapter testkit checks for write-capable metadata and behavior.

Exit criteria:

- Adapter contract suite passes for AWS adapters.
- Default redaction posture preserved.

### Phase 16 — CI rollout and documentation consolidation

- Add dedicated apply dry-run and apply workflows.
- Add apply smoke script for deterministic pass/fail checks.
- Publish policy-pack and sync-apply docs for website and package users.
- Consolidate README, API, validation, and operations messaging.

Exit criteria:

- `pnpm lint && pnpm type-check && pnpm test && pnpm build` passes.
- Apply smoke report generated at `qa-test/reports/env-governance-apply-smoke.json`.
- Docs are consistent across root/package/site surfaces.

## KPIs

- Apply safety rate: blocked unsafe apply attempts caught before mutation.
- Governance adoption: repositories using `verify` and apply dry-run workflows.
- Mean time to diagnose failures using audit and smoke artifacts.
- Documentation consistency drift between root/package/site docs.

## Risks and mitigations

- Risk: accidental write execution in protected environments.
  - Mitigation: protected branch checks + required preflight artifact.
- Risk: policy confusion across repos.
  - Mitigation: policy-pack layering docs with precedence examples.
- Risk: non-deterministic CI outcomes.
  - Mitigation: smoke workflows with explicit pass/fail expectations.

## Definition of done

Part 4 is complete when apply workflows and smoke checks are reproducible,
policy-pack and sync-apply documentation is published, and the workspace
quality gate remains green.
