import type { KnipConfig } from "knip";

const config: KnipConfig = {
  entry: [
    "app/**/{page,layout,loading,error,not-found,global-error,icon,template,default,route}.{ts,tsx}",
    "app/api/**/*.{ts,tsx}",
    "lib/env.ts",
    "auth.ts",
    // Template public API — these files are the starter kit's library surface for
    // consumers. Exporting from them without internal usage is intentional.
    "components/ui/**/*.{ts,tsx}",
    "lib/schemas/**/*.{ts,tsx}",
    "lib/auth.ts",
    "lib/utils.ts",
    "types/**/*.{ts,tsx}",
  ],
  project: [
    "app/**/*.{ts,tsx}",
    "lib/**/*.{ts,tsx}",
    "components/**/*.{ts,tsx}",
    "hooks/**/*.{ts,tsx}",
    "store/**/*.{ts,tsx}",
    "types/**/*.{ts,tsx}",
  ],
  ignoreDependencies: [
    // Used via @tailwindcss/postcss in build tooling — not imported directly in code
    "tailwindcss",
    // Peer dep via @tailwindcss/postcss — referenced in postcss.config.mjs at runtime
    "postcss",
  ],
};

export default config;
