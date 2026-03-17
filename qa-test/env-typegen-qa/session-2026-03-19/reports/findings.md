# QA Findings — @xlameiro/env-typegen@0.1.9 (Phase 1 + Phase 2 + Phase 3 + Phase 4 + Phase 5 + Phase 6 + Phase 7)

**QA session**: 2026-03-17
**Version tested**: 0.1.9
**Phases tested**: 1 (generate) + 2 (check) + 3 (diff) + 4 (doctor) + 5 (contract formats) + 6 (inference deep-dive) + 7 (programmatic API)
**Total findings**: 2
**Severity breakdown**: 0 High · 1 Medium · 1 Low

## Scope covered

- `--help`, `-h`, `--version`, `-v`
- Missing input error path (`no -i`, no config)
- Single and multi-generator outputs
- `--stdout`, `--dry-run`, `--no-format`, `--silent`
- Multi-input behavior and output naming
- JSDoc annotations in generated types
- Config auto-discovery logging and CLI override behavior
- `--watch` success path (regenerate on file change)
- `--watch` failure path (missing input file)
- `check` help + contract/example paths
- strict vs no-strict extra-variable behavior
- JSON output modes (`--json`, `--json=pretty`, `--json=compact`, `--output-file`, `--debug-values`)
- cloud provider snapshots (`vercel`, `cloudflare`, `aws`) and invalid snapshot handling
- plugin hooks (`transformSource`, `transformReport`, `transformContract`) and invalid plugin diagnostics
- type validation checks for url/number/boolean/enum/email/json/semver
- `diff` help, default target behavior, drift across targets, cloud target merge, JSON output file
- `doctor` help, missing-target grouping, default target set, combined diagnostics, JSON output file
- contract format compatibility (`.mjs`, `.ts`, legacy `vars`), enum and numeric-bound constraints, and secret debug behavior
- inference rule coverage (P2..P10), empty-value handling, and custom-rule precedence behavior
- programmatic API checks for `runGenerate`, `defineConfig`, and exported TypeScript types

## Findings

## FINDING-07 — Duplicate missing-file warning for `.env` in `doctor`

| Field        | Value                                       |
| ------------ | ------------------------------------------- |
| **ID**       | FINDING-07                                  |
| **Severity** | 🟢 Low                                      |
| **Category** | UX / verbosity                              |
| **File**     | `src/validation-command.ts` (doctor runner) |

### Description

When `doctor` runs with default targets in a directory where `.env` is missing, the warning line is printed twice:

`⚠ Target file not found: .env — treating as empty`

The grouped error output is correct (single grouped issue per missing target), but the duplicated warning line adds noise.

### Repro steps

```bash
tmp=$(mktemp -d /tmp/env-typegen-doctor-missing-XXXXXX)
cd "$tmp"
env-typegen doctor --contract /absolute/path/to/contracts/env.contract.mjs
```

### Actual output (excerpt)

```text
⚠ Target file not found: .env — treating as empty
⚠ Target file not found: .env — treating as empty
⚠ Target file not found: .env.production — treating as empty
```

### Expected behavior

Each missing target file should emit one warning line only.

### Suggested fix

Deduplicate warning emission for `doctor` target-file existence checks so each missing file is logged once.

## FINDING-08 — `--debug-values` reveals raw secret value for `ENV_SECRET_EXPOSED`

| Field        | Value                                       |
| ------------ | ------------------------------------------- |
| **ID**       | FINDING-08                                  |
| **Severity** | 🟡 Medium                                   |
| **Category** | Security / logging                          |
| **File**     | `src/validation/engine.ts` (`toIssueValue`) |

### Description

When `--debug-values` is enabled, secret values are included verbatim in JSON issue payloads, including `ENV_SECRET_EXPOSED` issues. This can leak sensitive data in CI logs or persisted artifacts.

### Repro steps

```bash
env-typegen check \
	--env fixtures/.env.secret \
	--contract contracts/secret-debug-contract.mjs \
	--json --debug-values
```

### Actual output

`"value":"shhh-super-secret"` appears in the JSON issue for `NEXT_PUBLIC_CLIENT_SECRET`.

### Expected behavior

Even with `--debug-values`, values for contract entries marked `secret: true` should be redacted (for example `"[REDACTED]"`) or omitted.

### Suggested fix

Update value serialization so secret-marked variables never emit raw values. Keep debug visibility for non-secret keys only.

## Validation summary

- FINDING-03 regression check: **PASS** — missing input message references `env-typegen.config.mjs`.
- FINDING-01 regression check: **PASS** — auto-discovered config logs `Using config: ...`.
- FINDING-02 regression check: **PASS** — `--help` documents multi-input basename behavior.
- FINDING-04 regression check: **PASS** — auto-discovery order is `.mjs -> .js` only.
- Phase 2 command-matrix check: **PASS** — all Phase 2 scoped scenarios passed after fixture-correct reruns.
- Cloud invalid snapshot path: **PASS** — exits with clear parse error (`Unexpected end of JSON input`) and non-zero code.
- Invalid plugin path/interface diagnostics: **PASS** — actionable error messages include required plugin shape.
- Phase 3 command-matrix check: **PASS** — all Phase 3 scoped scenarios behaved as expected.
- FINDING-05 regression check in diff defaults: **PASS** — default targets are `.env,.env.production` and do not include `.env.example`.
- Phase 4 command-matrix check: **PASS with 1 low-severity UX finding**.
- FINDING-06 regression check: **PASS (partial)** — grouped missing-file diagnostics are present; however, warning emission still duplicates `.env` once.
- Phase 5 command-matrix check: **PASS with 1 medium-severity security finding**.
- Contract format compatibility checks: **PASS** — `.mjs` contract works, `.ts` contract fails with actionable error, legacy `vars` format is accepted.
- Phase 6 command-matrix check: **PASS** — I-1..I-10 validated, including custom rule precedence override for `PORT`.
- Phase 7 command-matrix check: **PASS** — A-1..A-4 validated (A-4 rerun with `--skipLibCheck` to isolate package type export checks from ambient workspace MDX type noise).

## Evidence

Raw command log: `reports/phase1-generate-tests.log`

Raw command log: `reports/phase2-check-tests.log`

Raw command log: `reports/phase3-diff-tests.log`

Raw command log: `reports/phase4-doctor-tests.log`

Raw command log: `reports/phase5-contract-tests.log`

Raw command log: `reports/phase6-inference-tests.log`

Raw command log: `reports/phase7-programmatic-tests.log`

## Notes

- Initial failed cases (`G-C1`, `G-C3`, `G-C4`, `G-J1`) were caused by corrupted local QA fixture/config files during setup, not by package behavior.
- After fixing fixtures and rerunning those cases, all Phase 1 checks passed.
- Two Phase 2 failures were fixture-design artifacts (`C-V2`, `C-P2`) and passed on rerun with corrected fixtures.
- Phase 3 non-zero exit cases (`D-D2`, `D-D3`, `D-CL1`, `D-J1`) are expected because fixtures intentionally contain contract drift or invalid values.
- Phase 4 non-zero exit cases (`DR-F1`, `DR-F2`, `DR-V1`, `DR-J1`) are expected due to missing/default targets and intentional drift fixtures.
- Phase 5 non-zero exit cases for enum/numeric bounds are expected negative tests; only FINDING-08 is treated as a product deficiency.
- Initial `I-5` assertion miss was a grep pattern issue in QA script; rerun passed with fixed literal-match assertion.
- Initial `A-4` compile attempt failed due ambient `@types/mdx` JSX namespace errors in the workspace type environment; rerun with `--skipLibCheck` validated the package's exported type accessibility.
