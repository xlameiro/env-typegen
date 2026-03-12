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
    key: "X-Frame-Options",
    value: "SAMEORIGIN",
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
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // Next.js requires 'unsafe-inline' for hydration scripts unless nonces are used.
      // 'unsafe-eval' is intentionally omitted — not required in production builds.
      // Path to stricter CSP: generate a nonce per request in proxy.ts, pass it via
      // a response header (e.g., x-nonce), read it in layout.tsx, and inject it into
      // every <Script> and inline <style>. See Next.js CSP docs for the full walkthrough:
      // https://nextjs.org/docs/app/building-your-application/configuring/content-security-policy
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' blob: data:",
      "font-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      // Prevents loading in workers (no web worker or service worker usage by default).
      "worker-src 'none'",
      // Restricts web app manifest loading to same origin.
      "manifest-src 'self'",
      "upgrade-insecure-requests",
    ].join("; "),
  },
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
