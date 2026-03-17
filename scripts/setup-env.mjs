/**
 * setup-env.mjs
 *
 * Creates .env.local from .env.example with a generated AUTH_SECRET.
 * Runs automatically via the "postinstall" npm lifecycle hook.
 * Can also be run manually: pnpm setup
 *
 * Safe guards:
 *   - Skips in CI environments (CI=true)
 *   - Skips if .env.local already exists (never overwrites)
 *   - Skips if .env.example is missing (stripped clones)
 */
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

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

const template = readFileSync(".env.example", "utf8");
const secret = randomBytes(32).toString("base64");
const output = template.replace("your-auth-secret-here", secret);
writeFileSync(target, output, { mode: 0o600 });
console.log("✓ .env.local created with a generated AUTH_SECRET.");
console.log(
  "  Fill in OAuth credentials in .env.local if your project uses authentication.",
);
