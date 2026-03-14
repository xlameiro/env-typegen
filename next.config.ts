import withBundleAnalyzer from "@next/bundle-analyzer";
import type { NextConfig } from "next";

// Validates all env vars at build time and startup.
// Throws if a required variable is missing or malformed.
import "./lib/env";

const securityHeaders = [
  {
    key: "X-DNS-Prefetch-Control",
    value: "on",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    // DENY is consistent with the CSP frame-ancestors 'none' directive set in proxy.ts.
    // SAMEORIGIN would conflict: CSP (stricter, blocking all framing) would win in modern
    // browsers but the inconsistency is confusing. Align both to the most restrictive intent.
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
  // Content-Security-Policy is set dynamically by proxy.ts using a per-request nonce,
  // which eliminates the need for 'unsafe-inline' in script-src.
  // See proxy.ts for the CSP definition and nonce propagation logic.
  // API routes (/api/*) are excluded from the proxy.ts matcher and therefore do not
  // receive a CSP header — they return JSON, not HTML, so CSP is not applicable.
  // Cross-Origin Opener Policy: prevents other origins from gaining references to this window.
  // Required for SharedArrayBuffer and high-resolution timers. Safe with redirect-based OAuth
  // (Auth.js v5 default). If popup-based OAuth is added, change to "same-origin-allow-popups".
  {
    key: "Cross-Origin-Opener-Policy",
    value: "same-origin",
  },
];

const nextConfig: NextConfig = {
  // Cache Components: enables 'use cache' directive for fine-grained server-side caching.
  // See: https://nextjs.org/docs/app/api-reference/directives/use-cache
  cacheComponents: true,
  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
  // See: https://nextjs.org/docs/app/api-reference/config/next-config-js/typedRoutes
  typedRoutes: true,
  // React Compiler v1.0 (stable since Oct 2025) — automatically inserts
  // useMemo/useCallback/memo where beneficial. No manual memoization needed.
  // See: https://nextjs.org/docs/app/api-reference/config/next-config-js/reactCompiler
  reactCompiler: true,
  experimental: {
    browserDebugInfoInTerminal: {
      showSourceLocation: true,
      depthLimit: 5,
      edgeLimit: 100,
    },
  },
  images: {
    formats: ["image/avif", "image/webp"],
    // OAuth provider avatar domains — required for next/image to serve external images.
    remotePatterns: [
      { hostname: "lh3.googleusercontent.com" },
      { hostname: "avatars.githubusercontent.com" },
    ],
  },
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
};

export default withBundleAnalyzer({ enabled: process.env.ANALYZE === "true" })(
  nextConfig,
);
