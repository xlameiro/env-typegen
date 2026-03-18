## Infra Governance Part 3 Roadmap

## Objective

Operationalize env governance so teams can run deterministic `verify`, `plan`, `pull`, and `sync-preview` checks with reproducible CI evidence.

## Scope

- Runtime hardening and test debt closure for pull/loader behavior.
- Policy engine and read-only pre-sync command layer.
- Adapter maturity with shared contract testkit and realistic fixtures.
- Operations packaging with smoke automation and runbooks.

## Phase Plan

### Phase 8 — Runtime hardening

- Add complete tests for pull command and adapter loader.
- Standardize error messages and deterministic exit codes.
- Ensure governance workflow asserts both pass and expected-fail paths.

Exit criteria:

- `pnpm --filter @xlameiro/env-typegen lint`
- `pnpm --filter @xlameiro/env-typegen type-check`
- `pnpm --filter @xlameiro/env-typegen test`
- `pnpm --filter @xlameiro/env-typegen build`

### Phase 9 — Policy engine and safe pre-sync commands

- Add policy model/evaluator with predictable precedence.
- Add read-only `plan` and `sync-preview` commands.
- Integrate policy decisions into validation finalization.

Exit criteria:

- Command outputs are deterministic in both JSON and human mode.
- No regression on `generate`, `check`, `diff`, `doctor`, `verify`, and `pull`.

### Phase 10 — Adapter maturity and contract testkit

- Harden Vercel and Docker adapter parsing.
- Add shared adapter contract testkit.
- Use realistic fixture packs for regression protection.

Exit criteria:

- Adapter test coverage increased and stable.
- Default secret redaction preserved in reports.

### Phase 11 — Operations packaging and adoption readiness

- Publish smoke script and dedicated smoke workflow.
- Publish operations docs for website and package consumers.
- Align root/docs roadmap references.

Exit criteria:

- Workspace health check passes: `pnpm lint && pnpm type-check && pnpm test && pnpm build`.
- Smoke workflow can be executed locally and in CI with artifact output.

## KPIs

- Governance gate adoption: number of repositories/jobs using `verify` as blocking gate.
- Drift detection throughput: count of detected issues before merge/deploy.
- Mean setup time: time from install to first successful verify gate.
- Flaky governance rate: percentage of non-deterministic failures in governance workflows.

## Risks and mitigations

- API response variability in cloud providers: mitigated with high-fidelity fixtures and contract tests.
- Documentation drift across root/package/site docs: mitigated by synchronized phase-level updates.
- Policy complexity growth: mitigated by explicit precedence and conservative defaults.

## Definition of done

Part 3 is complete when all phase exits pass, smoke artifacts are reproducible, and governance docs/routes are aligned with actual runtime behavior.
