#!/usr/bin/env node
/**
 * strip-ai-config.mjs
 *
 * Archives all AI/Copilot configuration to .ai-config-backup/ and removes
 * the originals from the working tree. Also adds their paths to .gitignore
 * so they are not accidentally committed if restored.
 *
 * Run `pnpm restore:ai` to bring everything back.
 *
 * What gets archived and removed:
 *   .github/copilot-instructions.md       — Main Copilot/LLM instructions (93KB)
 *   .github/agents/                       — Agent .agent.md definitions
 *   .github/instructions/                 — Per-directory instruction files
 *   .github/prompts/                      — Reusable prompt files
 *   .github/hooks/                        — Agent lifecycle hook scripts
 *   .github/workflows/bug-triage.md       — Agentic CI workflow
 *   .github/workflows/dependency-upgrade.md — Agentic CI workflow
 *   .agents/                              — Skills and MCP agent tools
 *   .vscode/mcp.json                      — MCP server configuration
 *   AGENTS.md                             — AI task execution guide
 *   CLAUDE.md                             — Claude-specific instructions
 *   .coderabbit.yaml                      — CodeRabbit automated review config
 *   skills-lock.json                      — Skills integrity hashes
 *   llms.txt                              — LLM-optimised site description
 *
 * What is NOT touched (kept in the repository):
 *   .vscode/settings.json                 — project editor settings (non-AI content too)
 *   .vscode/tasks.json                    — VS Code build tasks
 *   .vscode/launch.json                   — debugger config
 *   .vscode/extensions.json               — recommended extensions
 *   .github/workflows/ci.yml              — standard CI pipeline
 *   .github/workflows/codeql.yml          — security scanning
 *   .github/workflows/dependabot-automerge.yml
 *   .github/dependabot.yml
 *   .github/ISSUE_TEMPLATE/
 *   .github/PULL_REQUEST_TEMPLATE.md
 *
 * Usage:
 *   pnpm strip:ai
 */

import { cpSync, existsSync, mkdirSync } from "node:fs";
import { readFile, rm, unlink, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const BACKUP_DIR = join(ROOT, ".ai-config-backup");

// ── Helpers ───────────────────────────────────────────────────────────────────

function info(msg) {
  process.stdout.write(msg + "\n");
}

/** Backs up and removes a directory. */
async function archiveDir(relPath) {
  const abs = join(ROOT, relPath);
  const dest = join(BACKUP_DIR, relPath);

  if (!existsSync(abs)) {
    info(`  – Skipped  ${relPath}/ (not found)`);
    return;
  }

  mkdirSync(dest, { recursive: true });
  cpSync(abs, dest, { recursive: true });
  await rm(abs, { recursive: true, force: true });
  info(`  ✓ Archived ${relPath}/`);
}

/** Backs up and removes a single file. */
async function archiveFile(relPath) {
  const abs = join(ROOT, relPath);
  const dest = join(BACKUP_DIR, relPath);

  if (!existsSync(abs)) {
    info(`  – Skipped  ${relPath} (not found)`);
    return;
  }

  mkdirSync(dirname(dest), { recursive: true });
  cpSync(abs, dest);
  await unlink(abs);
  info(`  ✓ Archived ${relPath}`);
}

// ── Gitignore marker ──────────────────────────────────────────────────────────

const GITIGNORE_START = "# >>> AI-CONFIG-STRIPPED-START (managed by strip-ai-config.mjs)";
const GITIGNORE_END   = "# <<< AI-CONFIG-STRIPPED-END";

const GITIGNORE_BLOCK = `
${GITIGNORE_START}
# Restore with: pnpm restore:ai
.github/copilot-instructions.md
.github/agents/
.github/instructions/
.github/prompts/
.github/hooks/
.github/workflows/bug-triage.md
.github/workflows/dependency-upgrade.md
.agents/
.vscode/mcp.json
AGENTS.md
CLAUDE.md
.coderabbit.yaml
skills-lock.json
llms.txt
# Backup archive created by pnpm strip:ai
.ai-config-backup/
${GITIGNORE_END}
`;

/** Appends the AI-config block to .gitignore if not already present. */
async function patchGitignore() {
  const gitignorePath = join(ROOT, ".gitignore");
  const content = await readFile(gitignorePath, "utf-8");

  if (content.includes(GITIGNORE_START)) {
    info("  – Skipped  .gitignore (AI-config section already present)");
    return;
  }

  await writeFile(gitignorePath, content.trimEnd() + "\n" + GITIGNORE_BLOCK, "utf-8");
  info("  ✓ Patched  .gitignore →  AI-config paths added");
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  info("\n🤖  Stripping AI/Copilot configuration…\n");

  if (existsSync(BACKUP_DIR)) {
    info(
      "⚠️   Backup directory .ai-config-backup/ already exists.\n" +
      "    This usually means strip:ai was already run.\n" +
      "    Run `pnpm restore:ai` first, then re-run `pnpm strip:ai` if needed.\n",
    );
    process.exit(1);
  }

  mkdirSync(BACKUP_DIR, { recursive: true });
  info(`  📦 Backup target: .ai-config-backup/\n`);

  // ── Directories ─────────────────────────────────────────────────────────────
  info("Archiving directories…");
  await archiveDir(".github/agents");
  await archiveDir(".github/instructions");
  await archiveDir(".github/prompts");
  await archiveDir(".github/hooks");
  await archiveDir(".agents");

  // ── Individual files ────────────────────────────────────────────────────────
  info("\nArchiving files…");
  await archiveFile(".github/copilot-instructions.md");
  await archiveFile(".github/workflows/bug-triage.md");
  await archiveFile(".github/workflows/dependency-upgrade.md");
  await archiveFile(".vscode/mcp.json");
  await archiveFile("AGENTS.md");
  await archiveFile("CLAUDE.md");
  await archiveFile(".coderabbit.yaml");
  await archiveFile("skills-lock.json");
  await archiveFile("llms.txt");

  // ── .gitignore ──────────────────────────────────────────────────────────────
  info("\nUpdating .gitignore…");
  await patchGitignore();

  // ── Done ────────────────────────────────────────────────────────────────────
  info("\n✅  Done! AI/Copilot configuration archived to .ai-config-backup/\n");
  info("The backup is gitignored and stays on your machine only.");
  info("Run `pnpm restore:ai` to restore everything.\n");
}

try {
  await main();
} catch (error) {
  console.error("\n❌  Error:", error.message);
  process.exit(1);
}
