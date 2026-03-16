#!/usr/bin/env node
/**
 * restore-ai-config.mjs
 *
 * Restores AI/Copilot configuration from the .ai-config-backup/ directory
 * that was created by `pnpm strip:ai`, and removes the corresponding
 * .gitignore entries.
 *
 * Usage:
 *   pnpm restore:ai
 */

import { cpSync, existsSync } from "node:fs";
import { readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const BACKUP_DIR = join(ROOT, ".ai-config-backup");

// ── Helpers ───────────────────────────────────────────────────────────────────

function info(msg) {
  process.stdout.write(msg + "\n");
}

/** Restores a directory from backup. */
function restoreDir(relPath) {
  const src = join(BACKUP_DIR, relPath);
  const dest = join(ROOT, relPath);

  if (!existsSync(src)) {
    info(`  – Skipped  ${relPath}/ (not in backup)`);
    return;
  }

  cpSync(src, dest, { recursive: true });
  info(`  ✓ Restored ${relPath}/`);
}

/** Restores a single file from backup. */
function restoreFile(relPath) {
  const src = join(BACKUP_DIR, relPath);
  const dest = join(ROOT, relPath);

  if (!existsSync(src)) {
    info(`  – Skipped  ${relPath} (not in backup)`);
    return;
  }

  cpSync(src, dest);
  info(`  ✓ Restored ${relPath}`);
}

// ── Gitignore cleanup ─────────────────────────────────────────────────────────

const GITIGNORE_START = "# >>> AI-CONFIG-STRIPPED-START (managed by strip-ai-config.mjs)";
const GITIGNORE_END   = "# <<< AI-CONFIG-STRIPPED-END";

/** Removes the AI-config block from .gitignore. */
async function unpatchGitignore() {
  const gitignorePath = join(ROOT, ".gitignore");
  const content = await readFile(gitignorePath, "utf-8");

  if (!content.includes(GITIGNORE_START)) {
    info("  – Skipped  .gitignore (AI-config section not found)");
    return;
  }

  // Remove the block including the surrounding blank line
  const startIdx = content.indexOf("\n" + GITIGNORE_START);
  const endIdx = content.indexOf(GITIGNORE_END) + GITIGNORE_END.length;

  if (startIdx === -1 || endIdx < GITIGNORE_END.length) {
    info("  ⚠  .gitignore: markers found but could not parse block — skipping");
    return;
  }

  const cleaned = content.slice(0, startIdx) + content.slice(endIdx);
  await writeFile(gitignorePath, cleaned.trimEnd() + "\n", "utf-8");
  info("  ✓ Patched  .gitignore →  AI-config entries removed");
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  info("\n🤖  Restoring AI/Copilot configuration…\n");

  if (!existsSync(BACKUP_DIR)) {
    info(
      "❌  Backup directory .ai-config-backup/ not found.\n" +
      "    Run `pnpm strip:ai` first to create a backup, then restore.\n",
    );
    process.exit(1);
  }

  // ── Directories ─────────────────────────────────────────────────────────────
  info("Restoring directories…");
  restoreDir(".github/agents");
  restoreDir(".github/instructions");
  restoreDir(".github/prompts");
  restoreDir(".github/hooks");
  restoreDir(".agents");

  // ── Individual files ────────────────────────────────────────────────────────
  info("\nRestoring files…");
  restoreFile(".github/copilot-instructions.md");
  restoreFile(".github/workflows/bug-triage.md");
  restoreFile(".github/workflows/dependency-upgrade.md");
  restoreFile(".vscode/mcp.json");
  restoreFile("AGENTS.md");
  restoreFile("CLAUDE.md");
  restoreFile(".coderabbit.yaml");
  restoreFile("skills-lock.json");
  restoreFile("llms.txt");

  // ── .gitignore ──────────────────────────────────────────────────────────────
  info("\nUpdating .gitignore…");
  await unpatchGitignore();

  // ── Remove backup ────────────────────────────────────────────────────────────
  await rm(BACKUP_DIR, { recursive: true, force: true });
  info("  ✓ Removed  .ai-config-backup/\n");

  info("✅  Done! AI/Copilot configuration restored.\n");
}

try {
  await main();
} catch (error) {
  console.error("\n❌  Error:", error.message);
  process.exit(1);
}
