---
description: Generate a VS Code agent lifecycle hook — creates a shell script and adds the corresponding entry to hooks.json.
agent: "agent"
tools: [vscode, execute, read, edit, search]
---

You are creating a VS Code Copilot agent lifecycle hook for this project.
Read the user's automation description from the chat, then follow these steps in order.

---

## Step 1 — Understand the automation

Ask the user (or infer from context) what they want to automate and _when_ it should run.
Match their description to the correct lifecycle event:

| Event          | Runs                                        | Typical use                                                                             |
| -------------- | ------------------------------------------- | --------------------------------------------------------------------------------------- |
| `sessionStart` | Once when the agent session begins          | Inject environment context, validate Node/pnpm versions, print branch info              |
| `preToolUse`   | Before every tool call                      | Block destructive operations, scan for secrets, enforce policies                        |
| `sessionEnd`   | When the agent session ends (natural close) | Run quality gate (lint + tsc + test + build)                                            |
| `postToolUse`  | After every tool call                       | Lint after file edits — **disabled by default** (causes VS Code terminal proliferation) |
| `stop`         | When the agent is stopped                   | Auto-commit pending changes, write session summary                                      |

> **Warning on `preToolUse`**: hooks that return `{"permissionDecision":"deny"}` block the tool call.
> Only use this for genuine safety gates (secret detection, destructive command prevention).
> A bug in a `preToolUse` hook can prevent the agent from doing any work.

---

## Step 2 — Check for an existing script

Before creating a new script, read the current contents of `.github/hooks/scripts/`:

```bash
ls .github/hooks/scripts/
```

If a script already covers the use case, prefer extending it over creating a new file.

---

## Step 3 — Write the shell script

Create `.github/hooks/scripts/<descriptive-name>.sh` following this pattern:

```bash
#!/usr/bin/env bash
# [One-line description of what this hook does and when it runs]
set -uo pipefail

# For preToolUse hooks — read the tool call context from stdin
# INPUT=$(cat)
# TOOL_NAME=$(python3 -c "import sys,json; print(json.load(sys.stdin).get('toolName',''))" <<< "$INPUT" 2>/dev/null || echo "")

# --- [Your automation logic here] ---

# For preToolUse hooks that may block: emit JSON with permissionDecision
# echo '{"permissionDecision":"allow"}'        # allow the tool call
# echo '{"permissionDecision":"deny","message":"Reason: ..."}' # block it

exit 0   # Always exit 0 — a non-zero exit is a hook error, not a denial
```

**Rules for all hook scripts:**

- `set -uo pipefail` at the top
- Always exit 0 — the agent runtime treats non-zero as a hook infrastructure error
- Use `python3` (not `jq`) for JSON parsing — it is always available
- Keep scripts fast: `sessionStart`/`preToolUse`/`postToolUse` should complete in < 5 s
- Do not depend on external network calls in `preToolUse` (blocks every tool invocation)

---

## Step 4 — Add entry to hooks.json

Read `.github/hooks/hooks.json`, then add the new hook entry to the correct event key:

```json
{
  "version": 1,
  "hooks": {
    "<event>": [
      {
        "type": "command",
        "bash": "./.github/hooks/scripts/<script-name>.sh",
        "cwd": ".",
        "timeoutSec": <timeout>
      }
    ]
  }
}
```

Suggested timeouts by event:

| Event          | Suggested `timeoutSec`           |
| -------------- | -------------------------------- |
| `sessionStart` | 15                               |
| `preToolUse`   | 10                               |
| `sessionEnd`   | 180 (includes full quality gate) |
| `postToolUse`  | 30                               |
| `stop`         | 30                               |

If the key already exists, append a new object to the array — do not replace existing hooks.

---

## Step 5 — Verify the hook runs

```bash
# Simulate a sessionStart or sessionEnd hook manually
bash .github/hooks/scripts/<script-name>.sh
```

For `preToolUse` / `postToolUse` hooks that read stdin, pipe a sample payload:

```bash
echo '{"toolName":"edit","toolArgs":{"path":"src/app/page.tsx","new_str":"test"}}' | bash .github/hooks/scripts/<script-name>.sh
```

Confirm the script exits 0 and produces the expected output.

---

## Step 6 — Report

Output a summary with:

1. **Event type chosen** — and why
2. **Script created** — path and what it does
3. **hooks.json updated** — show the new entry
4. **How to disable** — e.g., remove the entry from `hooks.json`

---

## Rules

- **Never add `postToolUse` to `hooks.json` by default** — it causes VS Code to open a new terminal for every file edit. Document it as an opt-in step if the user asks for it.
- **Scripts must be idempotent** — safe to run multiple times without side effects
- **No hardcoded secrets in scripts** — read from env vars or `.env.local`
- **English only** — all comments and output messages in English
