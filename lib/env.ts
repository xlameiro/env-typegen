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
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  },

  /**
   * Treat empty strings as undefined — catches misconfigured env vars
   * that are set to "" instead of being absent entirely.
   */
  emptyStringAsUndefined: true,
});
