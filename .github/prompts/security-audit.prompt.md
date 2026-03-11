---
name: "Security Audit"
agent: "agent"
description: "Multi-agent OWASP security audit — explores auth, API routes, Server Actions, and Zod boundaries in parallel, then implements fixes"
tools:
  [vscode, execute, read, agent, edit, search, "io.github.upstash/context7/*"]
---

# Multi-Agent OWASP Security Audit

You are running a two-phase security audit on this Next.js 16 / Auth.js v5 codebase.

**Always read `.github/instructions/security-and-owasp.instructions.md` and `.github/copilot-instructions.md` before starting.**

---

## Phase 1 — Explore (spawn 10 sub-agents in parallel)

Each sub-agent explores exactly one area and returns a structured finding report.

| Sub-agent | Area to explore                                                                                                                                                                        |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1         | Auth flows — `auth.ts`, `proxy.ts`, `app/auth/**`. Check: session fixation, missing CSRF tokens, cookie attributes (`httpOnly`, `secure`, `sameSite`), redirect-after-login validation |
| 2         | API route handlers — `app/api/**`. Check: missing Zod validation, raw `req.json()` without parsing, missing auth checks, verbose error messages leaking stack traces                   |
| 3         | Server Actions — `app/**/actions.ts`. Check: missing auth guards, missing Zod parsing at the top of every action, `void` return instead of typed `Result<T, AppError>`                 |
| 4         | Zod boundary coverage — does every Route Handler and Server Action call `.parse()` or `.safeParse()` before using any user-supplied value?                                             |
| 5         | Redirect validation — are all redirect targets validated against an allowlist? Check for open redirect patterns (`redirect(req.searchParams.get('next'))` without sanitization)        |
| 6         | Error message leakage — are raw error messages or stack traces returned in API responses? Check for `catch (error) { return NextResponse.json({ error })` patterns                     |
| 7         | Rate limiting — are login, sign-up, and password-reset endpoints protected against brute force? Check for missing rate limiting middleware                                             |
| 8         | Cookie security — are Auth.js / non-Auth cookies explicitly setting `httpOnly: true`, `secure: true`, `sameSite: 'lax'` or `'strict'`?                                                 |
| 9         | Dependency CVEs — run `pnpm audit --audit-level=moderate` and report packages with known vulnerabilities                                                                               |
| 10        | `NEXT_PUBLIC_` variables — check `lib/env.ts` and all env var usages. Are any secrets or tokens exposed via `NEXT_PUBLIC_` prefix?                                                     |

**Each sub-agent must return a table row in this exact format:**

```
| Area | Finding | Severity (High/Medium/Low/Clean) | File:line | OWASP Category |
```

If the area is clean, return `| Area | Clean | Clean | — | — |`.

---

## Phase 2 — Implement (one focused agent per finding)

For every finding with `Severity = High` or `Medium`:

1. Read the relevant file and understand the full context before touching anything.
2. Apply the minimal fix following `security-and-owasp.instructions.md`.
3. Add or update a Vitest unit test that demonstrates the vulnerability is closed.
4. Do not change code beyond the security issue — no refactoring scope creep.

---

## Phase 3 — Verify

After all fixes are applied:

```bash
pnpm lint && pnpm type-check && pnpm test
```

All three must pass. Fix any regressions before finishing.

---

## Output

Produce a final summary table:

| Area | Finding | Severity | Fix Applied | File Changed |
| ---- | ------- | -------- | ----------- | ------------ |

End with either:

- `## AUDIT COMPLETE ✅` — all High/Medium findings resolved, quality gates pass
- `## AUDIT BLOCKED` — describe exactly what requires human decision before proceeding
