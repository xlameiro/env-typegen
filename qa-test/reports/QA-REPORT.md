# QA Report — `@xlameiro/env-typegen` v0.1.5

**Date:** 2026-03-17
**Tester:** GitHub Copilot (QA session)
**Package version:** `0.1.5`
**Node:** 20.x · pnpm 10.13.1

---

## Summary

| Severity                              | Count |
| ------------------------------------- | ----- |
| 🔴 Bug (incorrect behavior)           | 7     |
| 🟠 UX / DX issue (confusing behavior) | 5     |
| 🟡 Documentation gap                  | 4     |
| ✅ Working correctly                  | 12    |

---

## ✅ What Works Well

- `ts`, `zod`, `t3`, `declaration` generators all produce correct output
- Single-format generation writes to the exact output path
- Multi-format generation appends correct suffixes (`.typescript.ts`, `.zod.ts`, `.t3.ts`, `.declaration.d.ts`)
- `--dry-run` correctly previews without writing
- `--stdout` outputs content to terminal (works with multiple formats using section headers)
- `--silent` suppresses all output
- `--no-format` skips Prettier formatting
- `check` validates env files against a contract correctly (valid env → OK, invalid → errors with codes)
- `--strict` / `--no-strict` correctly promote/demote extra vars between errors and warnings
- `--json` / `--json=pretty` output clean, machine-readable JSON
- `--output-file` persists JSON report to a file
- `--debug-values` includes values in JSON report (without it, values are `null` for security)
- Cloud providers (`vercel`, `aws`) work correctly when file format matches expected schema
- All three plugin hooks (`transformContract`, `transformSource`, `transformReport`) fire and integrate correctly
- Config auto-discovery (`env-typegen.config.mjs`) works and CLI flags override it
- Output directories are created automatically if they don't exist
- Exit codes: 0 for OK/WARN, 1 for FAIL and usage errors
- `--generator` / `-g` alias for `--format` works correctly
- `typescript` as alias for `ts` format works
- `--config` / `-c` loads a config from explicit path
- Invalid format name produces a clear, actionable error

---

## 🔴 Bugs (Incorrect Behavior)

### BUG-01 · TypeScript contract files can't be loaded at runtime

**Commands:** `check`, `diff`, `doctor`, config auto-discovery
**Severity:** High
**Steps to reproduce:**

```bash
# Create env.contract.ts
npx env-typegen check --env .env --contract env.contract.ts
# → ✖ Unknown file extension ".ts"

# OR create env-typegen.config.ts — tool finds it but can't load it
```

**Impact:** The primary documented workflow (`.ts` contract/config files) fails at runtime. Users must use `.mjs` instead.
**Default in help:** `--contract <path> (default: env.contract.ts)` — the default is itself broken.
**Fix suggestion:** Run TypeScript files through `tsx` or `ts-node` at runtime, OR update all docs/defaults to `.mjs`. Consider adding a `--loader tsx` note.

---

### BUG-02 · Comma-separated URL lists incorrectly inferred as a single URL

**Commands:** All generators (`ts`, `zod`, `t3`)
**Severity:** Medium
**Steps to reproduce:**

```bash
# .env.example contains:
ALLOWED_ORIGINS=https://example.com,https://www.example.com
# Zod output:
ALLOWED_ORIGINS: z.string().url()  # ← .url() fails on comma-separated list
```

**Impact:** Generated Zod/T3 schemas that use `ALLOWED_ORIGINS` will throw a `ZodError` at runtime because a comma-separated list of URLs doesn't pass `.url()` validation. The TypeScript generator wraps the comment-coercions but doesn't fail. Only Zod/T3 runtime validation breaks.
**Fix suggestion:** When a value contains commas, avoid inferring `.url()`. Instead infer as `z.string()` or add a `// comma-separated values` comment.

---

### BUG-03 · `declaration` format produces `.ts` extension in single-format mode

**Command:** `npx env-typegen -i .env.example -o out.ts -f declaration`
**Severity:** Low
**Steps to reproduce:**

```bash
npx env-typegen -i .env.example -o out.ts -f declaration
# Writes: out.ts (not out.d.ts)
# Multi-format correctly writes: out.declaration.d.ts
```

**Impact:** Ambient declaration file has the wrong extension. TypeScript won't treat it as a declaration file.
**Fix suggestion:** When the generator is `declaration` and single-format, change the output extension to `.d.ts` even if the user specifies `.ts`.

---

### BUG-04 · Empty values satisfy `required: true` — not flagged as missing

**Command:** `check`
**Severity:** High
**Steps to reproduce:**

```bash
# .env file contains: STRIPE_SECRET_KEY=  (empty value)
# Contract: STRIPE_SECRET_KEY: { required: true, ... }
npx env-typegen check --env .env --contract env.contract.mjs
# → Status: OK  (no error for empty required var)
```

**Impact:** Required environment variables set to empty strings pass validation. A deployed app will crash at runtime when it tries to use an empty secret.
**Fix suggestion:** Treat empty string values as missing for `required: true` variables. Add an `ENV_EMPTY_REQUIRED` error code.

---

### BUG-05 · Inconsistent boolean validation: "yes" passes but "maybe" fails

**Command:** `check`
**Severity:** Medium
**Steps to reproduce:**

```bash
# .env contains: DEBUG=maybe  → ERROR [ENV_INVALID_TYPE] expected=boolean received=string
# .env contains: ENABLE_ANALYTICS=yes  → no error (treated as valid boolean)
```

**Impact:** "yes"/"no" appear to be accepted as valid booleans, but this is undocumented. Other truthy strings like "maybe" or "1" produce inconsistent results. CI validation results depend on undocumented behavior.
**Fix suggestion:** Define and document an explicit allowlist for boolean values: `["true", "false", "1", "0"]`. Optionally support "yes"/"no" if documented explicitly.

---

### BUG-06 · Duplicate keys in input produce invalid TypeScript

**Command:** All generators
**Severity:** Medium
**Steps to reproduce:**

```bash
# .env.example contains:
PORT=3000
PORT=4000
# ts output:
readonly PORT: string;
readonly PORT: string;  # ← TypeScript error: Duplicate identifier
```

**Impact:** Generated output won't compile. The tool exits 0 (success) even though the output is invalid TypeScript.
**Fix suggestion:** Deduplicate keys during parsing (last-wins or first-wins), or warn about duplicates and emit only one declaration.

---

### BUG-07 · `ENV_CONFLICT` shows `expected=string received=string` — identical types flagged as conflict

**Command:** `diff`, `doctor`
**Severity:** Medium
**Steps to reproduce:**

```bash
npx env-typegen diff --targets .env,.env.staging,.env.example --contract env.contract.mjs
# → ERROR [ENV_CONFLICT] AUTH_SECRET has conflicting inferred type. expected=string received=string
```

**Impact:** The error message says there's a type conflict, but both sides show the same type (`string`). This is misleading and makes the output untrustworthy. Users can't tell which conflicts are real.
**Fix suggestion:** Show the actual inferred types from each environment, not just the contract's expected type. E.g.: `inferred in .env=string, inferred in .env.example=unknown`. Or suppress the conflict when types match the contract.

---

## 🟠 UX / DX Issues

### UX-01 · `diff` and `doctor` produce identical output — no differentiation

**Severity:** Medium
The `doctor` command is documented as providing "aggregated diagnostics" with prioritization. In practice, it outputs the exact same flat error list as `diff`. The only difference is a generic 4-line "Recommendations" footer.
**Fix suggestion:** `doctor` should:

- Group issues by environment (not flat list)
- Show a priority matrix (critical required vars vs optional drift vs extra vars)
- Distinguish between `check` findings (single env) and `diff` findings (cross-env drift)

---

### UX-02 · Missing target file silently treated as empty env

**Command:** `diff`, `doctor`
**Severity:** Medium

```bash
npx env-typegen diff --targets .env,.env.production --contract env.contract.mjs
# .env.production doesn't exist → 62 "missing" errors, no indication the file is absent
```

A typo in a filename generates a flood of false-positive errors with no hint that the file itself doesn't exist. Users spend time debugging non-existent drift.
**Fix suggestion:** Warn explicitly: `⚠ Target file .env.production not found — treating as empty`. Or fail with an error when strict mode is on.

---

### UX-03 · Cloud connector silently returns empty when format doesn't match

**Command:** `check`, `diff`, `doctor` with `--cloud-provider`
**Severity:** Medium
The Vercel connector accepts root arrays OR `{ "envs": [...] }` — but not `{ "env": [...] }` (which is the actual Vercel API field name in some responses). An unrecognized format silently returns an empty variable map, leading to false "all required vars missing" errors.
**Fix suggestion:** Log a warning when the cloud file parses to 0 variables: `⚠ No environment variables found in cloud file — check format`. Document the exact expected JSON shape for each provider.

---

### UX-04 · `transformSource` plugin API asymmetry is easy to misuse

**Severity:** Low
The `transformSource` hook receives `{ environment: string; values: Record<string,string> }` but must return `Record<string,string>` (just `values`). Returning `{ ...source, myField }` causes the tool to inject `environment` and `values` as fake env var names with no error or warning — just incorrect behavior.
**Fix suggestion:** Validate plugin return values against the expected shape. If an object contains non-string values, warn: `Plugin "myPlugin" transformSource returned an object with non-string values — check that you returned only the values Record`.

---

### UX-05 · `check` with no contract and no `.env.example` throws raw ENOENT

**Severity:** Low

```bash
# In a directory with no contract or .env.example:
npx env-typegen check --env .env
# → ✖ ENOENT: no such file or directory, open '.env.example'
```

Raw Node.js error instead of a helpful message.
**Fix suggestion:** Catch ENOENT and emit: `✖ No contract found. Create env.contract.mjs or pass --contract to enable validation. Alternatively, provide --example to infer from a .env.example file.`

---

## 🟡 Documentation Gaps

### DOC-01 · Config and contract files show `.ts` extension everywhere but only `.mjs`/`.js` work at runtime

All docs (`README`, `configuration.mdx`, `getting-started.mdx`) show `env-typegen.config.ts` and `env.contract.ts` as the primary format, but both fail at runtime with "Unknown file extension .ts".
The error message itself gives correct guidance, but the docs need to be updated to lead with `.mjs` and explain the `.ts` → `.mjs` pattern.

---

### DOC-02 · Multiple `-i` inputs behavior not documented

When multiple `-i` flags are passed, each input generates its own separate output file. The `-o` path is treated as a base directory/prefix, not the output file. This is surprising and nowhere in the docs.
**Fix suggestion:** Add a section explaining multi-input behavior: "Each input file generates a separate output file in the specified output directory."

---

### DOC-03 · `ENV_CONFLICT` semantics not explained in docs

The `check`/`diff` output uses error code `ENV_CONFLICT` but nowhere documents what "conflicting inferred type" means, when it fires, or what the `expected` and `received` fields represent in this context (they're not the contract types but the cross-env inferred types).

---

### DOC-04 · Cloud JSON format not documented with examples

The docs mention `vercel`, `cloudflare`, `aws` as cloud providers but don't show the expected JSON structure for each. Users are expected to obtain these by running `vercel env pull` or equivalent, but the exact format accepted is not specified. The actual Vercel format uses field name `envs` which differs from what users see via `vercel env ls --json`.

---

## Reproduction Test Files

All QA test fixtures are in `qa-test/`:

```
qa-test/
  .env                    # valid, matches contract
  .env.example            # source of truth
  .env.staging            # partial env with drift
  .env.bad                # type violations
  .env.edge               # edge case values
  .env.dup                # duplicate keys
  env.contract.mjs        # runnable contract
  env.contract.ts         # type-checked-only (won't load at runtime)
  env-typegen.config.mjs  # runnable config
  env-typegen.config.ts.bak  # original .ts config (for reference)
  plugins/qa-plugin.mjs   # test plugin
  cloud/vercel-env.json   # vercel cloud fixture
  cloud/aws-env.json      # aws cloud fixture
  outputs/                # generated files
  reports/                # JSON reports
```

---

## Rerun Comparison (2026-03-17, package 0.1.6)

### Rerun coverage snapshot

- Rerun evidence log: `qa-test/reports/qa-cli-rerun-2026-03-17.log`
- Coverage matrix: `qa-test/reports/qa-matrix-rerun-2026-03-17.md`
- Consolidated rerun findings: `qa-test/reports/qa-findings-rerun-2026-03-17.md`
- Current repo target version: `0.1.7` (rerun evidence collected on `0.1.6`)
- Total cases executed: 63
- PASS: 27
- FAIL: 36
- FAIL expected by design: 35
- FAIL requiring investigation: 1

### What changed compared to first QA pass

- The rerun used an isolated fixture set in `qa-test/fixtures-rerun/` to avoid cross-contamination with earlier reports.
- The full matrix now includes explicit coverage for `--json=compact` across `check`, `diff`, and `doctor`.
- Config-driven command paths (`-c`) were revalidated with config-relative plugin resolution working as expected.
- No new critical regressions were discovered.

### Current top priority

- `generate` UX mismatch remains: main help advertises `[generate]` while `env-typegen generate ...` exits with `Unexpected argument 'generate'`.

### Updated priority queue

1. P1: Align `generate` help text and parser behavior (either support alias or remove it from help).
2. P2: Improve docs around intentional non-zero exits for invalid/drift scenarios in validation commands.
3. P2: Consider publishing the rerun matrix script pattern for contributors as an official QA workflow.
