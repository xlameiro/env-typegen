#!/usr/bin/env sh
# .github/hooks/scripts/git-secret-scan.sh
#
# Git pre-commit secret scanner.
# Scans staged file additions for hardcoded credentials before a commit is made.
#
# Complements .github/hooks/scripts/pre-tool-secret-scan.sh, which covers AI agent
# file writes. Together they ensure secrets cannot enter the repo via any code path.
#
# Usage: Called automatically from .husky/pre-commit
# Returns: 0 (clean) | 1 (potential secret detected — commit blocked)

# Collect only added lines from staged changes (skip deletions and context lines).
STAGED=$(git diff --cached --unified=0 2>/dev/null | grep '^+[^+]' || true)

# Nothing staged — nothing to scan.
[ -z "$STAGED" ] && exit 0

FOUND=0

# check PATTERN LABEL
# Checks staged additions against an ERE pattern; sets FOUND=1 if matched.
check() {
  if printf '%s\n' "$STAGED" | grep -qE "$1" 2>/dev/null; then
    printf '  ❌ %s\n' "$2"
    FOUND=1
  fi
}

check 'sk-[a-zA-Z0-9]{20,}'                             "OpenAI API key"
check 'sk-ant-[a-zA-Z0-9-]{40,}'                        "Anthropic API key"
check 'ghp_[a-zA-Z0-9]{36}'                             "GitHub personal access token"
check 'gho_[a-zA-Z0-9]{36}'                             "GitHub OAuth token"
check 'github_pat_[a-zA-Z0-9_]{82}'                     "GitHub fine-grained PAT"
check 'AKIA[0-9A-Z]{16}'                                 "AWS access key ID"
check 'sk_live_[a-zA-Z0-9]{24,}'                        "Stripe live secret key"
check 'rk_live_[a-zA-Z0-9]{24,}'                        "Stripe live restricted key"
check '-----BEGIN (RSA |EC |DSA |OPENSSH )?PRIVATE KEY'  "Private key material"
check 're_[a-zA-Z0-9]{20,}'                             "Resend API key"
check 'SG\.[a-zA-Z0-9_-]{22}\.[a-zA-Z0-9_-]{43}'       "SendGrid API key"
check 'postgresql://[^:]+:[^@]{8,}@'                    "PostgreSQL connection string with password"
check 'mysql://[^:]+:[^@]{8,}@'                         "MySQL connection string with password"
check 'mongodb(\+srv)?://[^:]+:[^@]{8,}@'               "MongoDB connection string with password"

if [ "$FOUND" -eq 1 ]; then
  printf '\n🚨 Potential secret(s) detected in staged changes (see above).\n'
  printf '   Hardcoded credentials must never be committed to source control.\n'
  printf '   → Use .env.local for secrets and import via @/lib/env\n'
  printf '   → To unstage a file: git restore --staged <path>\n\n'
  exit 1
fi
