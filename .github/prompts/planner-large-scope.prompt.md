---
description: "Operational prompt for large-scope planning requests (audits, full project reviews, migrations). Forces session-mode declaration, batching, checkpoints, and coverage reporting."
agent: Planner
tools:
  - vscode/memory
  - search/listDirectory
  - search/fileSearch
  - search/textSearch
  - search/codebase
  - search/searchSubagent
  - read/readFile
  - agent/runSubagent
  - todo
---

# Large-Scope Planner

You are running a **large-scope planning session**. Follow the protocol below without skipping any step.

## Step 0 — Scope Inventory (MANDATORY FIRST)

1. Run `search/listDirectory` on the workspace root.
2. Count total files and identify functional domains (routes, components, lib/utils, auth, API, tests, config, infra, docs…).
3. Apply the Session Mode Decision Matrix:

| Signal                    | Mode A — Single Session | Mode B — Multi-Session                                                |
| ------------------------- | ----------------------- | --------------------------------------------------------------------- |
| Files requiring full read | ≤ 40                    | > 40                                                                  |
| Functional domains        | ≤ 3                     | > 3                                                                   |
| Request type keywords     | —                       | "everything", "all", "whole project", "exhaustive", "audit the whole" |

4. **Declare the Session Mode** — output one of these blocks as the very first thing in your response:

```
## Session Mode: A — Single Session
Estimated scope: X files across Y domains.
All files will be read before producing the plan.
```

```
## Session Mode: B — Multi-Session
This session covers Batch [N] of [total estimated].
Previously completed: [list or "none"]
This batch covers: [domains]
Remaining after this batch: [domains]
```

---

## For Mode A — Single Session

Proceed directly:

1. Read all relevant files.
2. Produce the full plan using the standard Planner output sections (see `planner.agent.md`).
3. Include **Coverage Report** and **Confidence and Limits** sections.

---

## For Mode B — Multi-Session

### Batch 1 (scope map + domain classification)

1. List every top-level directory and classify it into a domain.
2. Assign a priority order to domains (highest risk / most central first).
3. Produce a **Scope Map**:

```
Domain          | Directory            | Files | Priority | Risk
----------------|----------------------|-------|----------|-----
Auth            | app/auth/, lib/auth  | 8     | 1        | High
API routes      | app/api/             | 4     | 2        | High
Core components | components/          | 12    | 3        | Medium
...
```

4. Save this checkpoint to session memory (`vscode/memory`):

```
Batch: 1 of M
Covered domains: [Scope Map produced]
Pending domains: [all except Scope Map]
Key findings so far: [any immediate risks noticed]
Next batch starts at: [first domain in priority order]
```

5. End with:
   > `"Batch 1 of M complete. Scope map produced. To continue, open a new Planner session and request: [Planner — Batch 2: <domain name>]."`

---

### Batches 2…N (one domain per session)

At the start of each batch:

1. Read the checkpoint from session memory.
2. Confirm which domain this batch covers.
3. Read all files in that domain.
4. Produce domain findings:
   - Key patterns and conventions observed
   - Violations or inconsistencies
   - Security implications
   - Cross-domain dependencies
5. Update checkpoint:

```
Batch: N of M
Covered domains: [updated list]
Pending domains: [updated list]
Key findings so far: [cumulative brief list]
Next batch starts at: [next domain]
```

6. End with:
   > `"Batch N of M complete. X domains covered, Y pending. Continue with [Planner — Batch N+1: <next domain>]."`

---

### Final Batch (consolidation)

1. Read all batch checkpoints from session memory.
2. Synthesise findings across all domains.
3. Produce the complete plan with:
   - All standard sections (Overview, Requirements, Files to Create/Modify, Implementation Steps, Data Flow, Testing Plan, Open Questions)
   - **Coverage Report**
   - **Confidence and Limits**
4. Mark the session complete.

---

## Coverage Report (required in every plan output)

| Category                   | Detail             |
| -------------------------- | ------------------ |
| Directories examined       | `X of Y`           |
| Files fully read           | `X`                |
| Domains fully covered      | [list]             |
| Domains skipped / not read | [list with reason] |
| Estimated coverage         | `XX%`              |

> If coverage < 100%, all assumptions derived from unread areas must appear in Open Questions.

## Confidence and Limits (required in every plan output)

- **Confidence level**: High / Medium / Low
- **Reason for confidence gap**: [if not High]
- **Key assumptions**: [list]
- **Residual risks**: [list]
- **Session limit reached**: Yes / No

---

## Rules

- Never skip Step 0 — failing to declare Session Mode is the most common way a plan loses credibility
- Never claim exhaustiveness unless Coverage Report shows 100%
- Never carry stale session state — always re-read the checkpoint at the start of each batch
- If a domain is too large for one batch, split it and note this in the checkpoint
