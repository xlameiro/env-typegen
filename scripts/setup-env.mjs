/**
 * setup-env.mjs
 *
 * Creates .env.local from .env.example if it does not already exist.
 * Runs automatically via the "postinstall" npm lifecycle hook.
 * Can also be run manually: pnpm setup
 */
import { copyFileSync, existsSync } from "node:fs";

if (process.env.CI) {
  console.log("CI detected — skipping .env.local setup.");
  process.exit(0);
}

const target = ".env.local";

if (existsSync(target)) {
  console.log(".env.local already exists — skipping setup.");
  process.exit(0);
}

if (!existsSync(".env.example")) {
  console.log(".env.example not found — skipping setup.");
  process.exit(0);
}

copyFileSync(".env.example", target);
console.log("✓ .env.local created from .env.example.");
