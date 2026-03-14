import { env } from "@/lib/env";

export const APP_NAME = "Next.js Starter";
export const APP_DESCRIPTION =
  "A professional Next.js 16 starter template with TypeScript, Tailwind CSS v4, Auth.js v5, Zod, Zustand, Vitest, and Playwright.";
export const APP_VERSION = "0.1.0";

// BCP 47 language tag used for the `lang` attribute in layout.tsx and global-error.tsx.
// Update this when changing the app's locale — e.g. "es", "fr", "pt".
// For multi-locale (i18n) support, see ## Internationalization in .github/copilot-instructions.md
// and .github/instructions/i18n.instructions.md for the full Tier 2 / Tier 3 setup guide.
export const APP_LOCALE = "en";

export const SITE_URL = env.NEXT_PUBLIC_APP_URL;

export const ROUTES = {
  home: "/",
  signIn: "/auth/sign-in",
  signUp: "/auth/sign-up",
  dashboard: "/dashboard",
  settings: "/settings",
  profile: "/profile",
} as const;

export const API_ROUTES = {
  auth: "/api/auth",
  health: "/api/health",
} as const;
