import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    include: ["**/*.test.ts", "**/*.test.tsx"],
    exclude: ["node_modules", ".agents", ".next", "e2e", "tests"],
    setupFiles: ["./vitest.setup.ts"],
    typecheck: {
      enabled: true,
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["app/**", "components/**", "hooks/**", "lib/**", "store/**"],
      exclude: ["**/*.test.*", "**/*.spec.*", "**/*.d.ts"],
      thresholds: { lines: 80 },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
});
