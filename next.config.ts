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
      // 'unsafe-eval' is intentionally omitted — not needed in production.
      // To achieve a stricter policy, implement nonce-based CSP via proxy.ts.
      // See: https://nextjs.org/docs/app/building-your-application/configuring/content-security-policy
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' blob: data:",
      "font-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "upgrade-insecure-requests",
    ].join("; "),
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
  experimental: {
    // Typed routes: TypeScript-safe `href` props for <Link> and router methods.

    browserDebugInfoInTerminal: {
      showSourceLocation: true,
      depthLimit: 5,
      edgeLimit: 100,
    },
  },
  images: {
    formats: ["image/avif", "image/webp"],
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
