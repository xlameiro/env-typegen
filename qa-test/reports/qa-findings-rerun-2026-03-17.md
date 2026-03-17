## QA Findings — Rerun (2026-03-17)

- Scope: Phase 2 consolidation from rerun matrix
- Inputs:
  - qa-test/reports/qa-cli-rerun-2026-03-17.log
  - qa-test/reports/qa-matrix-rerun-2026-03-17.md
  - qa-test/reports/qa-findings-2026-03-17.md (baseline)
- Result: 63 cases executed, 27 pass, 36 fail (35 expected negative, 1 investigate)
- Status update: package version in repository bumped from 0.1.6 to 0.1.7 after rerun completion.

## Findings

### P1 — Inconsistent generate UX: help advertises [generate] but explicit generate fails

- Category: Bug / DX inconsistency
- Severity: Medium
- Evidence:
  - Case: generate-explicit-subcommand
  - Command: pnpm exec env-typegen generate -i <file> -o <file>
  - Exit: 1
  - Message: Unexpected argument 'generate'. This command does not take positional arguments
  - Log: qa-test/reports/qa-cli-rerun-2026-03-17.log
- Why this matters:
  - The main help text shows usage as env-typegen [generate] ..., which implies generate is a valid optional subcommand.
  - New users can follow help text and still get a failure.
- Recommendation:
  1. Either accept generate as an alias of the default command, or
  2. Remove [generate] from help usage text to match real parser behavior.
- Acceptance criteria:
  - Running pnpm exec env-typegen generate -i ... exits 0 and behaves like default, OR help no longer documents generate.

## Confirmed expected-failure behavior (not bugs)

- Invalid cloud provider is correctly rejected with clear list of valid values.
- Invalid plugin shape is correctly rejected with explicit expected interface.
- Missing plugin file is clearly reported.
- check/diff/doctor fail with drift and invalid fixtures as designed.
- JSON modes (json, json=pretty, json=compact) produce output while preserving fail exit code for invalid states.
- output-file writes report artifacts for check/diff/doctor negative scenarios.

## Delta vs previous QA baseline

- No new critical regressions detected in rerun.
- Previous known issues remain valid and are not contradicted by this rerun.
- One inconsistency is reconfirmed and prioritized here (generate help vs runtime behavior).

## Prioritized backlog

- P1: Align generate help text and parser behavior.
- P2: Keep expanding docs for expected negative exits in check/diff/doctor to reduce confusion when fail is intentional.
- P2: Consider shipping an official QA matrix script in package docs for contributors.
