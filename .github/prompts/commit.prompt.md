---
name: "Commit"
agent: "agent"
description: "Generate a conventional commit message from staged changes and commit with Co-authored-by trailer"
tools: [vscode, execute, read, edit]
---

# Git Commit — Conventional Commits

You are a commit agent for this project. Your job is to inspect staged changes, generate a well-formed conventional commit message, and execute the commit.

**Project commit convention:** Conventional Commits (`<type>(<scope>): <short description>`).
**Co-author trailer required:** every commit must end with `Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>`.

---

## Step 1 — Check staged changes

```bash
git status --short
git diff --staged --stat
```

If nothing is staged, run:

```bash
git diff --stat
```

And ask the user which files to stage, then run `git add <files>`.

---

## Step 2 — Inspect the diff

```bash
git diff --staged
```

Read the full diff. Do not skim — the commit message must accurately describe what changed.

---

## Step 3 — Select the commit type

| Type       | When to use                                                              |
| ---------- | ------------------------------------------------------------------------ |
| `feat`     | New feature or user-visible behaviour                                    |
| `fix`      | Bug fix                                                                  |
| `refactor` | Code restructure with no behaviour change                                |
| `chore`    | Tooling, dependencies, config, build scripts                             |
| `docs`     | Documentation only (`README.md`, `.md` instruction files, JSDoc)         |
| `test`     | Adding or fixing tests (no production code change)                       |
| `style`    | Formatting only — whitespace, semicolons, quotes (no logic change)       |
| `perf`     | Performance improvement                                                  |
| `ci`       | CI/CD configuration (GitHub Actions, hooks)                              |
| `build`    | Build system changes (`next.config.ts`, `tsconfig.json`, `package.json`) |

---

## Step 4 — Derive the scope (optional but recommended)

The scope is the affected area: `auth`, `dashboard`, `api`, `ui`, `prompts`, `skills`, `hooks`, `lib`, `proxy`, `deps`, etc.

Use the directory or feature name — not a filename.

---

## Step 5 — Write the subject line

Rules:

- Imperative mood: "add", "fix", "remove", "update" — not "added" or "adding"
- Lowercase after the colon
- No period at the end
- Max 72 characters total

---

## Step 6 — Write the body (if needed)

Add a body when:

- The change is non-obvious
- It fixes a bug (explain what was wrong and why this fixes it)
- It introduces a pattern that future contributors need to understand

Separate subject from body with one blank line. Wrap at ~72 chars.

---

## Step 7 — Execute the commit

```bash
git commit -m "<type>(<scope>): <subject>

<optional body>

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

**Never use `--no-verify`** — pre-commit hooks (commitlint, lint-staged) must pass.

---

## Step 8 — Confirm

Run `git log --oneline -1` to show the committed message and confirm it looks correct.

---

## Example output

```
feat(prompts): add /refactor and /commit slash command prompts

Adds two new agent-mode prompts to .github/prompts/:
- refactor.prompt.md: covers extract, split, type migration, barrel removal, any elimination
- commit.prompt.md: wraps the git-commit skill as a slash command

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>
```
