#!/usr/bin/env bash
# session-stop-autocommit.sh
# Auto-commits all pending changes when the agent session stops.
# Opt-in: add a "Stop" entry to .github/hooks/hooks.json to activate.
#
# Designed to be safe:
# - Exits silently with 0 if there are no pending changes.
# - Never uses --no-verify (respects pre-commit hooks).
# - Never overwrites work already committed.

set -euo pipefail

# Check if there are any staged or unstaged tracked changes
if git diff --quiet && git diff --cached --quiet && [ -z "$(git ls-files --others --exclude-standard)" ]; then
  # Nothing to commit — exit silently
  exit 0
fi

echo "[session-stop-autocommit] Pending changes detected — auto-committing..."

git add -A

git commit -m "chore: agent session auto-commit [skip ci]"

echo "[session-stop-autocommit] Done."
