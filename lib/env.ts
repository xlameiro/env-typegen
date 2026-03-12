import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

/**
 * Type-safe environment variables validated at build time and startup.
 * Add all env vars here — never use `process.env.*` directly elsewhere.
 *
 * Add `import "./lib/env"` (or `import "./src/lib/env"`) at the top of
 * `next.config.ts` so validation runs during `next build`.
 *
 * Set SKIP_ENV_VALIDATION=true in CI or when running builds without a
 * full .env (e.g., `SKIP_ENV_VALIDATION=true pnpm build`).
 */
export const env = createEnv({
  skipValidation: Boolean(process.env.SKIP_ENV_VALIDATION),
  /**
   * Server-side env vars — never exposed to the browser.
   * Do NOT prefix with NEXT_PUBLIC_.
   */
  server: {
    // Auth.js v5 — optional: only required when authentication is actually used.
    // If absent, auth routes fail gracefully; the rest of the app is unaffected.
    // Generate a value with: openssl rand -base64 32  (or run: pnpm setup)
    AUTH_SECRET: z
      .string()
      .min(32, "AUTH_SECRET must be at least 32 characters")
      .optional()
      .describe(
        "Auth.js signing secret — required only when using authentication. " +
          "Generate with: openssl rand -base64 32, or run `pnpm setup`.",
      ),

    // Google OAuth (optional — only required if using Google provider)
    AUTH_GOOGLE_ID: z
      .string()
      .min(1)
      .optional()
      .describe("Google OAuth client ID from console.cloud.google.com"),
    AUTH_GOOGLE_SECRET: z
      .string()
      .min(1)
      .optional()
      .describe("Google OAuth client secret"),

    // GitHub OAuth (optional)
    AUTH_GITHUB_ID: z
      .string()
      .min(1)
      .optional()
      .describe("GitHub OAuth app client ID"),
    AUTH_GITHUB_SECRET: z
      .string()
      .min(1)
      .optional()
      .describe("GitHub OAuth app client secret"),

    // Database (optional — uncomment DATABASE_URL in .env.local when adding a DB adapter)
    DATABASE_URL: z
      .url()
      .optional()
      .describe(
        "PostgreSQL connection string — required when using a DB adapter",
      ),

    // Node environment
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development")
      .describe("Runtime environment — set automatically by Next.js"),
  },

  /**
   * Client-side env vars — inlined into the browser bundle at build time.
   * ONLY put values here that are safe to expose to every user.
   * Never put tokens, secrets, or internal URLs here.
   */
  client: {
    NEXT_PUBLIC_APP_URL: z
      .url()
      .default("http://localhost:3000")
      .describe(
        "Canonical app URL — used for absolute links and OpenGraph metadata",
      ),
  },

  /**
   * Destructure `process.env` so @t3-oss/env-nextjs can read it.
   * Required — do not remove.
   */
  runtimeEnv: {
    AUTH_SECRET: process.env.AUTH_SECRET,
    AUTH_GOOGLE_ID: process.env.AUTH_GOOGLE_ID,
    AUTH_GOOGLE_SECRET: process.env.AUTH_GOOGLE_SECRET,
    AUTH_GITHUB_ID: process.env.AUTH_GITHUB_ID,
    AUTH_GITHUB_SECRET: process.env.AUTH_GITHUB_SECRET,
    DATABASE_URL: process.env.DATABASE_URL,
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  },

  /**
   * Treat empty strings as undefined — catches misconfigured env vars
   * that are set to "" instead of being absent entirely.
   */
  emptyStringAsUndefined: true,
});
