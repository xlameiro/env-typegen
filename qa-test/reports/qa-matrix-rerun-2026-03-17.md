## QA Matrix — Rerun (2026-03-17)

- Package tested in rerun: @xlameiro/env-typegen 0.1.6
- Current target version in repo: 0.1.7
- Evidence log: qa-test/reports/qa-cli-rerun-2026-03-17.log
- Total cases: 63
- PASS: 27
- FAIL: 36

## Result semantics

- PASS: command returned exit code 0
- FAIL (expected): negative scenario intentionally validating error handling
- FAIL (investigate): scenario expected to pass but failed

## Case matrix

| Case                         | Exit | Classification     | Notes                                                          |
| ---------------------------- | ---- | ------------------ | -------------------------------------------------------------- |
| help-main                    | 0    | PASS               | Main help rendered                                             |
| version-main                 | 0    | PASS               | Version 0.1.6                                                  |
| help-check                   | 0    | PASS               | Subcommand help rendered                                       |
| help-diff                    | 0    | PASS               | Subcommand help rendered                                       |
| help-doctor                  | 0    | PASS               | Subcommand help rendered                                       |
| generate-default             | 0    | PASS               | Multi-generator default output created                         |
| generate-explicit-subcommand | 1    | FAIL (investigate) | Help advertises [generate], parser rejects positional generate |
| generate-format-ts           | 0    | PASS               | Explicit ts generation                                         |
| generate-format-typescript   | 0    | PASS               | Synonym typescript accepted                                    |
| generate-format-zod          | 0    | PASS               | Zod output generated                                           |
| generate-format-t3           | 0    | PASS               | t3 output generated                                            |
| generate-format-declaration  | 0    | PASS               | declaration output generated                                   |
| generate-generator-alias-g   | 0    | PASS               | -g alias works                                                 |
| generate-multi-format        | 0    | PASS               | Combined formats with suffixes                                 |
| generate-multi-input         | 0    | PASS               | Multiple inputs accepted                                       |
| generate-stdout              | 0    | PASS               | stdout mode works                                              |
| generate-dry-run             | 0    | PASS               | dry-run without writing                                        |
| generate-no-format           | 0    | PASS               | formatting disabled                                            |
| generate-silent              | 0    | PASS               | success logs suppressed                                        |
| generate-config-short-c      | 0    | PASS               | config path loaded                                             |
| check-valid                  | 0    | PASS               | Valid env passes                                               |
| check-invalid                | 1    | FAIL (expected)    | Invalid values correctly fail                                  |
| check-example-only           | 0    | PASS               | example bootstrap works                                        |
| check-strict                 | 1    | FAIL (expected)    | strict catches extras                                          |
| check-no-strict              | 1    | FAIL (expected)    | no-strict still fails due missing/invalid required vars        |
| check-json                   | 1    | FAIL (expected)    | JSON emitted for invalid env                                   |
| check-json-pretty            | 1    | FAIL (expected)    | pretty JSON emitted                                            |
| check-json-compact           | 1    | FAIL (expected)    | compact alias accepted                                         |
| check-output-file            | 1    | FAIL (expected)    | report persisted to check-report.json                          |
| check-debug-values           | 1    | FAIL (expected)    | debug-values includes raw values                               |
| check-cloud-vercel           | 0    | PASS               | vercel cloud snapshot valid                                    |
| check-cloud-cloudflare       | 0    | PASS               | cloudflare cloud snapshot valid                                |
| check-cloud-aws              | 0    | PASS               | aws cloud snapshot valid                                       |
| check-cloud-invalid-provider | 1    | FAIL (expected)    | unknown provider error is clear                                |
| check-plugin-valid           | 0    | PASS               | valid plugin loads                                             |
| check-plugin-repeatable      | 0    | PASS               | repeatable plugin flag works                                   |
| check-plugin-invalid-shape   | 1    | FAIL (expected)    | plugin contract validation works                               |
| check-plugin-missing         | 1    | FAIL (expected)    | missing plugin error is clear                                  |
| check-config-short-c         | 0    | PASS               | config + check path works                                      |
| diff-default                 | 1    | FAIL (expected)    | drift intentionally present                                    |
| diff-example-only            | 1    | FAIL (expected)    | drift vs inferred contract                                     |
| diff-strict                  | 1    | FAIL (expected)    | strict mode drift failure                                      |
| diff-no-strict               | 1    | FAIL (expected)    | required drift still fails                                     |
| diff-json                    | 1    | FAIL (expected)    | JSON for drift                                                 |
| diff-json-pretty             | 1    | FAIL (expected)    | pretty JSON for drift                                          |
| diff-json-compact            | 1    | FAIL (expected)    | compact JSON alias for drift                                   |
| diff-output-file             | 1    | FAIL (expected)    | report persisted to diff-report.json                           |
| diff-debug-values            | 1    | FAIL (expected)    | debug-values output on drift                                   |
| diff-cloud-aws               | 1    | FAIL (expected)    | cloud + file target drift                                      |
| diff-plugin-valid            | 1    | FAIL (expected)    | plugin run with drift still fails                              |
| diff-config-short-c          | 1    | FAIL (expected)    | config-driven diff catches drift                               |
| doctor-default               | 1    | FAIL (expected)    | aggregated check+diff fail on drift                            |
| doctor-example-only          | 1    | FAIL (expected)    | invalid env + drift fail                                       |
| doctor-strict                | 1    | FAIL (expected)    | strict aggregated failure                                      |
| doctor-no-strict             | 1    | FAIL (expected)    | required issues still fail                                     |
| doctor-json                  | 1    | FAIL (expected)    | JSON doctor report                                             |
| doctor-json-pretty           | 1    | FAIL (expected)    | pretty JSON doctor                                             |
| doctor-json-compact          | 1    | FAIL (expected)    | compact JSON doctor                                            |
| doctor-output-file           | 1    | FAIL (expected)    | report persisted to doctor-report.json                         |
| doctor-debug-values          | 1    | FAIL (expected)    | debug-values in doctor                                         |
| doctor-cloud-vercel          | 1    | FAIL (expected)    | cloud + target drift                                           |
| doctor-plugin-valid          | 1    | FAIL (expected)    | plugin + drift fail                                            |
| doctor-config-short-c        | 1    | FAIL (expected)    | config-driven doctor catches drift                             |

## Artifacts generated during rerun

- qa-test/fixtures-rerun/outputs/check-report.json
- qa-test/fixtures-rerun/outputs/diff-report.json
- qa-test/fixtures-rerun/outputs/doctor-report.json
- qa-test/fixtures-rerun/outputs/config-generated.typescript.ts
- qa-test/fixtures-rerun/outputs/config-generated.zod.ts
- Multiple generator outputs for default, no-format, silent, and format-specific cases

## Key takeaway

Only one case is classified as FAIL (investigate): generate-explicit-subcommand. All other FAIL cases are expected negative validations and confirm robust error signaling.
