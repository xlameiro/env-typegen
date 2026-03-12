---
agent: agent
description: "One iteration of a Ralph Loop — implements a single task from features.json or a markdown PRD, marks it done, commits, and stops."
---

You are running inside a Ralph Loop. Your context window is fresh each run.

1. Read `progress.txt` to understand what has already been done.
2. Read `features.json` (preferred) or `.github/prd/feature.prd.md` to find the FIRST incomplete task.
   - In `features.json`: pick the lowest-priority `"status": "fail"` entry.
   - In markdown PRD: find the FIRST unchecked item (`- [ ]`).
3. Implement that one task completely. Do not start the next task.
4. Mark it done:
   - In `features.json`: set `"status": "pass"`.
   - In markdown PRD: change `- [ ]` to `- [x]`.
5. Run `init.sh` to start the dev server (if not already running), then verify the feature works end-to-end.
6. Append a one-line summary to `progress.txt`.
7. Commit: `git add <changed files> && git commit -m "feat(<id>): <short description>"`
8. Run `pnpm type-check` — fix any type errors before stopping.
9. Stop. Do not ask for confirmation.
