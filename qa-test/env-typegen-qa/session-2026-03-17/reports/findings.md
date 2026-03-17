# QA Findings — @xlameiro/env-typegen@0.1.8

**QA session**: 2026-03-17
**Version tested**: 0.1.8
**Phases**: 1 (generate) + 2 (check / diff / doctor / cloud / plugins / watch)
**Total findings**: 6
**Severity breakdown**: 1 High · 4 Medium · 1 Low

**Resolution status (2026-03-17)**: ✅ All 6 findings fixed in source code and validated with lint/type-check/tests.

---

## FINDING-03 — Error message references unsupported config extension

| Field        | Value           |
| ------------ | --------------- |
| **ID**       | FINDING-03      |
| **Severity** | 🔴 High         |
| **Category** | Error messaging |
| **File**     | `src/cli.ts`    |

### Description

When no input file is specified (no `-i` flag and no config file found), the error message tells the user to "set input in `env-typegen.config.ts`". However, `.ts` config files **cannot be loaded at runtime** — attempting to use one causes an explicit error (see FINDING-04). The correct extension is `.mjs` (or `.js`).

### Repro steps

```bash
cd /tmp  # no config file, no -i flag
env-typegen
```

### Actual output

```
✖ No input file specified. Use -i <path> or set input in env-typegen.config.ts
```

### Expected output

```
✖ No input file specified. Use -i <path> or set input in env-typegen.config.mjs
```

### Suggested fix

In `src/cli.ts`, find the string `"No input file specified"` and change `.config.ts` → `.config.mjs` in the message.

---

## FINDING-04 — `.ts` config listed in auto-discovery but immediately errors when found

| Field        | Value                                                 |
| ------------ | ----------------------------------------------------- |
| **ID**       | FINDING-04                                            |
| **Severity** | 🟡 Medium                                             |
| **Category** | Config loading / UX                                   |
| **File**     | `src/config.ts` (CONFIG_FILE_NAMES) and config loader |

### Description

The auto-discovery search order includes `env-typegen.config.ts` as a candidate. When this file is found, the tool exits with a fatal error: "Cannot load TypeScript config directly". This creates contradictory behavior: the tool actively looks for a `.ts` config but cannot handle it.

Users who create `env-typegen.config.ts` (a natural TypeScript developer choice) will get a confusing experience: auto-discovery finds the file, then immediately fails.

### Repro steps

```bash
echo 'export default { generators: ["typescript"] }' > env-typegen.config.ts
env-typegen -i fixtures/.env.example -o out.ts
```

### Actual output

```
✖ Cannot load TypeScript config directly. Create env-typegen.config.mjs instead.
  Tip: rename your config to env-typegen.config.mjs and use defineConfig({...})
```

### Expected behavior — two valid options

**Option A (recommended)**: Remove `env-typegen.config.ts` from search list entirely. If a TS config is found but not in the search list, the user gets "no config found" behavior and sees the "use .mjs" hint from FINDING-03 fix.

**Option B**: Keep in search list, but emit a clear warning and skip it (try next candidate), instead of hard error.

### Note

The error message itself is good and actionable. The problem is setting user expectations by including `.ts` in the search list.

---

## FINDING-01 — Config auto-discovery silently overrides generator defaults

| Field        | Value                                    |
| ------------ | ---------------------------------------- |
| **ID**       | FINDING-01                               |
| **Severity** | 🟡 Medium                                |
| **Category** | UX / discoverability                     |
| **File**     | `src/cli.ts` (applyConfig / mergeConfig) |

### Description

When a `env-typegen.config.mjs` exists in the current working directory, the tool auto-discovers it and applies its settings **silently** — with no log message indicating a config was loaded. The default behavior (4 generators: ts, zod, t3, declaration) is replaced by whatever the config specifies without any user-visible indication.

This makes it very easy to get unexpected output when running the tool from a project root that has a config file. The user may not know why only 1 generator ran instead of 4.

### Repro steps

```bash
# In a dir that has env-typegen.config.mjs with generators:["typescript"]
env-typegen -i .env.example -o out.ts  # no -f flag
# Expects: 4 output files (default)
# Gets: 1 output file (from config)
```

### Actual behavior

Only 1 generator runs (as config specifies). No log indicating "Using config from ./env-typegen.config.mjs".

### Expected behavior

Either:

1. Log `ℹ Using config: ./env-typegen.config.mjs` when a config is auto-discovered (preferred)
2. Or document this clearly in `--help` output

### Note

Config override via `--config` flag is expected behavior. The issue is specifically with **silent** auto-discovery.

---

## FINDING-02 — Multi-input `--output` basename is silently ignored

| Field        | Value                                          |
| ------------ | ---------------------------------------------- |
| **ID**       | FINDING-02                                     |
| **Severity** | 🟡 Medium                                      |
| **Category** | UX / documentation                             |
| **File**     | `src/pipeline.ts` (`deriveOutputBaseForInput`) |

### Description

When using multiple `-i` inputs, the `--output` flag's **basename** portion is silently ignored. Only the directory and extension are extracted from `--output`, and files are named from the input file stems.

This is undocumented in `--help` text and is a surprising behavior for users who expect `-o ./outputs/env.ts` to produce `./outputs/env.ts`.

### Repro steps

```bash
env-typegen -i fixtures/app.env.example -i fixtures/local.env.example -o ./outputs/g12.ts
```

### Actual files created

```
outputs/app.env.ts    ← named from input "app.env" stem
outputs/local.env.ts  ← named from input "local.env" stem
```

### Expected (user intuition)

```
outputs/g12.ts  ← named from output basename
```

### Suggested fix — two options

**Option A**: Document this behavior in `--help`: "With multiple inputs, --output specifies the target directory and extension; files are named from input stems."

**Option B**: For multi-input, require an `--output-dir` flag instead of `--output`, and make `--output` only valid for single-input invocations. Error if `--output` is used with multiple inputs.

---

## Summary

| ID         | Severity  | Category         | Phase | Status   |
| ---------- | --------- | ---------------- | ----- | -------- |
| FINDING-03 | 🔴 High   | Error message    | 1     | Resolved |
| FINDING-04 | 🟡 Medium | Config loading   | 1     | Resolved |
| FINDING-01 | 🟡 Medium | UX silence       | 1     | Resolved |
| FINDING-02 | 🟡 Medium | UX / docs        | 1     | Resolved |
| FINDING-05 | 🟡 Medium | Validation logic | 2     | Resolved |
| FINDING-06 | 🟢 Low    | UX / verbosity   | 2     | Resolved |

### Quick wins (easiest fixes first)

1. **FINDING-03** — Change one string in `src/cli.ts`. ~2 min fix.
2. **FINDING-04** — Remove `env-typegen.config.ts` from `CONFIG_FILE_NAMES` array. ~5 min fix.
3. **FINDING-02** — Add one sentence to `--help` text. ~5 min doc fix.
4. **FINDING-01** — Add one `log()` call when config is auto-discovered. ~10 min fix.
5. **FINDING-05** — Remove `.env.example` from default `diff`/`doctor` targets. ~30 min fix (needs test coverage update).
6. **FINDING-06** — Deduplicate "N files missing, treating as empty" message. ~1h fix.

---

## FINDING-05 — `.env.example` in default diff/doctor targets causes ENV_INVALID_TYPE for placeholder values

| Field        | Value                                                  |
| ------------ | ------------------------------------------------------ |
| **ID**       | FINDING-05                                             |
| **Severity** | 🟡 Medium                                              |
| **Category** | Validation logic                                       |
| **Phase**    | 2 — diff / doctor commands                             |
| **File**     | `src/validation-command.ts` (default `--targets` list) |

### Description

The `diff` and `doctor` commands include `.env.example` in their **default `--targets`** list (alongside `.env` and `.env.production`). However, `.env.example` is typically the source of the contract — it contains **template/placeholder values** (e.g. `DATABASE_READONLY_URL=` — intentionally empty).

When the tool validates `.env.example` as a runtime target, it applies type-inference rules. Variable names ending in `URL` or matching url-like patterns have their value validated as a URL. An empty placeholder string fails that check with `ENV_INVALID_TYPE`:

```
✖ DATABASE_READONLY_URL — ENV_INVALID_TYPE: expected a valid URL, got ""
```

This creates a confusing loop: the same file used as a contract source (via `--example`) also appears as a failing target by default.

### Repro steps

```bash
# From a standard project dir that has .env.example with any empty URL-like var
env-typegen diff --example fixtures/.env.example
# → Uses default targets: .env, .env.example, .env.production
# → .env.example validates itself and fails on empty DATABASE_READONLY_URL
```

### Actual output

```
Status: FAIL
✖ [fixtures/.env.example] DATABASE_READONLY_URL — ENV_INVALID_TYPE
```

### Expected behavior

`.env.example` should not be in the default `--targets` list for `diff`/`doctor`. It is a contract template, not a runtime env file. Users should opt in explicitly if they want to validate `.env.example` against itself.

### Suggested fix

Remove `.env.example` from the default targets in `src/validation-command.ts`. Keep `.env` and `.env.production` as the defaults for `diff`/`doctor`. Document this in `--help`:

```
--targets  Comma-separated env files to compare against the contract.
           Defaults to: .env,.env.production
```

---

## FINDING-06 — Doctor with missing default target files emits overwhelming error flood

| Field        | Value                                       |
| ------------ | ------------------------------------------- |
| **ID**       | FINDING-06                                  |
| **Severity** | 🟢 Low                                      |
| **Category** | UX / verbosity                              |
| **Phase**    | 2 — doctor command                          |
| **File**     | `src/validation-command.ts` (doctor runner) |

### Description

The `doctor` command has three default targets: `.env`, `.env.example`, `.env.production`. When run in a directory where two of those files do not exist, it correctly warns for each missing file, but then proceeds to report **all required variables as missing** for each absent file — resulting in 39+ error lines for a project with ~20 variables.

A developer new to the tool who runs `env-typegen doctor` from a fresh project root will see a wall of errors with no clear indication that the root cause is simply "target files not found."

### Repro steps

```bash
cd /tmp/fresh-project  # .env and .env.production not present; only .env.example exists
env-typegen doctor --example .env.example
```

### Actual output (excerpt)

```
⚠ Target file not found: .env — treating as empty
⚠ Target file not found: .env.production — treating as empty
✖ [.env] DATABASE_URL — ENV_MISSING
✖ [.env] PORT — ENV_MISSING
✖ [.env] NODE_ENV — ENV_MISSING
... (39 total errors)
Status: FAIL (errors=39, warnings=0)
```

### Expected behavior

When **all** variables from a missing target file are missing (i.e., the file was empty/absent), group the output as a single diagnostic instead of per-variable noise:

```
⚠ .env — file not found (treating as empty; 19 variables missing)
⚠ .env.production — file not found (treating as empty; 20 variables missing)
Status: FAIL (errors=2 files missing)
```

Or alternatively, simply skip missing files in `doctor` output and only report concrete drift — add a `--strict` flag to include missing-file analysis.

### Suggested fix

In the doctor runner, after collecting issues, group issues by target file. If a file was not found (marked as `treating as empty`), emit a single summary line instead of individual `ENV_MISSING` errors per variable.
