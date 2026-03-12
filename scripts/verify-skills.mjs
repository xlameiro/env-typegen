#!/usr/bin/env node
/**
 * Verifies that SKILL.md files match the SHA-256 hashes recorded in skills-lock.json.
 * Exits with code 1 if any hash mismatch is detected.
 *
 * Usage:
 *   node scripts/verify-skills.js           # verify mode (used in CI)
 *   node scripts/verify-skills.js --update  # regenerate hashes from current local files
 *
 * After updating skills, commit the updated skills-lock.json.
 */

import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";

const isUpdate = process.argv.includes("--update");
const root = resolve(import.meta.dirname, "..");
const lockPath = join(root, "skills-lock.json");

if (!existsSync(lockPath)) {
  console.error("❌  skills-lock.json not found — run this script from the repo root.");
  process.exit(1);
}

const lock = JSON.parse(readFileSync(lockPath, "utf8"));
const skills = lock.skills ?? {};

const mismatches = [];
const checked = [];
const updated = [];

for (const [name, entry] of Object.entries(skills)) {
  if (!entry.computedHash) {
    // Local skills (sourceType: "local") have no hash — skip silently.
    continue;
  }

  const skillPath = join(root, ".agents", "skills", name, "SKILL.md");

  if (!existsSync(skillPath)) {
    mismatches.push(`  ${name}: SKILL.md not found at ${skillPath}`);
    continue;
  }

  const content = readFileSync(skillPath, "utf8");
  const actual = createHash("sha256").update(content).digest("hex");

  if (isUpdate) {
    if (actual !== entry.computedHash) {
      entry.computedHash = actual;
      updated.push(name);
    } else {
      checked.push(name);
    }
  } else {
    if (actual !== entry.computedHash) {
      mismatches.push(
        `  ${name}:\n    expected ${entry.computedHash}\n    actual   ${actual}`,
      );
    } else {
      checked.push(name);
    }
  }
}

if (isUpdate) {
  lock.lastUpdated = new Date().toISOString().slice(0, 10);
  writeFileSync(lockPath, JSON.stringify(lock, null, 2) + "\n", "utf8");
  if (updated.length > 0) {
    console.log(`✅  Updated ${updated.length} skill hash(es) in skills-lock.json:`);
    for (const name of updated) {
      console.log(`   ${name}`);
    }
  } else {
    console.log(`✅  All ${checked.length} skill hashes are already up to date.`);
  }
  process.exit(0);
}

if (mismatches.length > 0) {
  console.error(`\n❌  Skills integrity check FAILED — ${mismatches.length} mismatch(es):\n`);
  for (const msg of mismatches) {
    console.error(msg);
  }
  console.error(
    "\nRun `pnpm skills:update` to regenerate hashes from current local files, then commit skills-lock.json.",
  );
  process.exit(1);
}

console.log(`✅  Skills integrity check passed — ${checked.length} skill(s) verified.`);
