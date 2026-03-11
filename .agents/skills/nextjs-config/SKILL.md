---
name: nextjs-config
description: >
  Next.js 16 next.config.ts/js complete options reference. Use when configuring Next.js:
  routing (basePath, redirects, rewrites, headers), build output (output, distDir), image
  optimization (remotePatterns, deviceSizes, formats), top-level caching (cacheComponents,
  cacheLife), experimental features (authInterrupts, staleTimes, viewTransition), turbopack,
  server packages, TypeScript/ESLint config. Trigger on any next.config question or when
  setting up Next.js project configuration.
  See references/next-config-options.md for exhaustive per-option details with all sub-options.
---

# Next.js 16 — `next.config.ts` Complete Reference

> All options target **Next.js 16 / App Router**. TypeScript config (`next.config.ts`) is recommended.

## Config File Setup

```ts
// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // options here
};

export default nextConfig;
```

```js
// next.config.js (CommonJS)
/** @type {import('next').NextConfig} */
const nextConfig = {};
module.exports = nextConfig;
```

---

## Routing

### `basePath`

```ts
basePath: "/docs";
// All routes and Link hrefs are automatically prefixed
// Cannot be changed at runtime — baked into client bundles
```

### `trailingSlash`

```ts
trailingSlash: true;
// /about → /about/ (adds trailing slash)
// false (default) → /about/index.html redirects to /about
```

### `assetPrefix`

```ts
assetPrefix: "https://cdn.example.com";
// Prefix for static asset URLs (_next/static/...)
// Does NOT prefix public/ directory files
```

### `skipTrailingSlashRedirect`

```ts
skipTrailingSlashRedirect: true;
// Disables the built-in redirect for trailing slashes
// Useful when you handle trailing slashes manually in proxy.ts
```

### `skipProxyUrlNormalize`

> **Next.js 16**: Previously `skipMiddlewareUrlNormalize`.

```ts
skipProxyUrlNormalize: true;
// Disables URL normalization for direct URL visits vs client-nav
// Allows proxy.ts to see the original URL without normalization
```

---

## HTTP Routing — `headers()`, `redirects()`, `rewrites()`

See **`references/next-config-options.md`** for full matcher syntax with `has`/`missing`.

### `headers()`

```ts
async headers() {
  return [
    {
      source: '/api/:path*',
      headers: [
        { key: 'Access-Control-Allow-Origin', value: '*' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
      ],
    },
  ]
}
```

| Field      | Type                               | Description                                            |
| ---------- | ---------------------------------- | ------------------------------------------------------ |
| `source`   | `string`                           | Path pattern (supports `:param`, `:param*`, `:param?`) |
| `headers`  | `{ key: string; value: string }[]` | Headers to add                                         |
| `has`      | `RouteHas[]`                       | Match only if conditions present                       |
| `missing`  | `RouteHas[]`                       | Match only if conditions absent                        |
| `basePath` | `false`                            | Opt out of basePath prefix                             |
| `locale`   | `false`                            | Opt out of locale prefix                               |

### `redirects()`

```ts
async redirects() {
  return [
    { source: '/old', destination: '/new', permanent: true },  // 308
    { source: '/temp', destination: '/new', permanent: false }, // 307
  ]
}
```

| Field         | Type         | Default | Description                         |
| ------------- | ------------ | ------- | ----------------------------------- |
| `source`      | `string`     | —       | Incoming path pattern               |
| `destination` | `string`     | —       | Redirect target                     |
| `permanent`   | `boolean`    | —       | `true` → 308, `false` → 307         |
| `statusCode`  | `number`     | —       | Custom code (overrides `permanent`) |
| `has`         | `RouteHas[]` | —       | Conditional matching                |
| `missing`     | `RouteHas[]` | —       | Conditional absence matching        |
| `basePath`    | `false`      | —       | Opt out of basePath prefix          |

### `rewrites()`

```ts
async rewrites() {
  return {
    beforeFiles: [],  // checked before filesystem + pages
    afterFiles: [],   // checked after filesystem, before 404
    fallback: [],     // checked after filesystem + pages, before 404
  }
  // OR return a flat array (treated as afterFiles)
}
```

---

## Build

### `distDir`

```ts
distDir: ".next"; // default
distDir: "build"; // custom output directory
```

### `output`

```ts
output: "standalone"; // Self-contained server (includes only needed node_modules)
output: "export"; // Static HTML export (no server required)
// undefined (default) → standard server mode
```

### `cleanDistDir`

```ts
cleanDistDir: true; // default — clears distDir on each build
cleanDistDir: false; // keep previous build artifacts
```

### `generateBuildId`

```ts
generateBuildId: async () => {
  return process.env.GIT_COMMIT_SHA ?? "local";
};
```

### `compress`

```ts
compress: true; // default — enables gzip compression for SSR responses
compress: false; // disable if reverse proxy handles compression (nginx, Cloudflare)
```

### `poweredByHeader`

```ts
poweredByHeader: false; // removes X-Powered-By: Next.js header
```

### `pageExtensions`

```ts
pageExtensions: ["tsx", "ts", "jsx", "js"]; // default
pageExtensions: ["page.tsx", "page.ts"]; // require .page suffix
```

---

## Images

```ts
images: {
  remotePatterns: [
    {
      protocol: 'https',
      hostname: 's3.amazonaws.com',
      port: '',
      pathname: '/my-bucket/**',
      search: '',
    },
  ],
  deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
  imageSizes: [32, 48, 64, 96, 128, 256, 384],  // 16px removed in Next.js 16.1.6
  formats: ['image/avif', 'image/webp'],
  minimumCacheTTL: 14400,  // 4 hours (changed from 60s in Next.js 16)
  dangerouslyAllowSVG: false,
  contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  contentDispositionType: 'inline',  // or 'attachment'
  unoptimized: false,
  loader: 'default',   // or 'cloudinary', 'imgix', 'akamai', 'custom'
  loaderFile: './my-loader.ts',  // required when loader: 'custom'
  qualities: [25, 50, 75],  // allowed quality values
  localPatterns: [
    { pathname: '/assets/**', search: '' },
  ],
}
```

| Option                   | Type              | Default                                  | Description                                                      |
| ------------------------ | ----------------- | ---------------------------------------- | ---------------------------------------------------------------- |
| `remotePatterns`         | `RemotePattern[]` | `[]`                                     | Allowlisted remote image sources                                 |
| `localPatterns`          | `LocalPattern[]`  | —                                        | Restrict local image paths                                       |
| `deviceSizes`            | `number[]`        | `[640,750,828,1080,1200,1920,2048,3840]` | Breakpoints for full-width images                                |
| `imageSizes`             | `number[]`        | `[32,48,64,96,128,256,384]`              | Sizes for partial-width images (16px removed in v16.1.6)         |
| `formats`                | `string[]`        | `['image/avif', 'image/webp']`           | Accepted format order                                            |
| `minimumCacheTTL`        | `number`          | `14400`                                  | Seconds to cache optimized images                                |
| `dangerouslyAllowSVG`    | `boolean`         | `false`                                  | Allow SVG optimization (XSS risk)                                |
| `contentSecurityPolicy`  | `string`          | —                                        | CSP for SVG responses                                            |
| `contentDispositionType` | `string`          | `'inline'`                               | Content-Disposition header                                       |
| `unoptimized`            | `boolean`         | `false`                                  | Bypass optimization pipeline                                     |
| `loader`                 | `string`          | `'default'`                              | Custom image loader                                              |
| `loaderFile`             | `string`          | —                                        | Path to custom loader (when `loader: 'custom'`)                  |
| `qualities`              | `number[]`        | —                                        | Restrict allowed quality values                                  |
| `maximumRedirects`       | `number`          | `3`                                      | Max image redirects before error (new in v16.1.6; was unlimited) |

---

## Rendering

### `reactStrictMode`

```ts
reactStrictMode: true; // Enables React's development-mode double-invoking checks
```

### `reactCompiler` (Next.js 16)

> **Promoted from `experimental` to stable in Next.js 16.**

```ts
// Enable for all components (recommended when ready)
reactCompiler: true;

// Opt-in mode — only applies to components with 'use memo' directive
reactCompiler: {
  compilationMode: "annotation";
}
```

> Automatically inserts `useMemo`, `useCallback`, and `memo` at compile time. Do **not** add these manually when `reactCompiler: true` is set — the compiler handles it better than human judgment. Requires `babel-plugin-react-compiler` (`pnpm add -D babel-plugin-react-compiler`). Expect higher compile times.

### `typedRoutes`

> **Promoted from `experimental` to stable in Next.js 16.**

```ts
typedRoutes: true;
// Generates type definitions for all app routes
// <Link href="/"> and router.push() are type-checked at compile time
// Requires TypeScript
```

---

## Experimental Features

### `cacheComponents` (Next.js 16)

```ts
cacheComponents: true;
// Replaces experimental.dynamicIO from Next.js 15
// Enables automatic caching of React components
// Unlocks the 'use cache' directive
```

### `cacheLife` (Next.js 16)

Define named `cacheLife` profiles for use with the `cacheLife()` function inside `'use cache'` scopes.

```ts
cacheLife: {
  editorial: {
    stale: 600,        // seconds — serve from client cache (min 30s enforced)
    revalidate: 3600,  // seconds — background revalidation on server
    expire: 86400,     // seconds — hard expiry; never serve after this
  },
  realtime: { stale: 30, revalidate: 10, expire: 300 },
}
```

> Built-in profiles: `'default'`, `'seconds'`, `'minutes'`, `'hours'`, `'days'`, `'weeks'`, `'max'`.
> Custom profiles extend the built-in set and can be referenced by name: `cacheLife('editorial')`.

### `experimental.ppr` (Partial Prerendering)

```ts
experimental: {
  ppr: true,
  // true: enables PPR for ALL routes
  // 'incremental': enables PPR only on pages that export:
  //   export const experimental_ppr = true
}
```

See also: `experimental_ppr` as a per-page segment export (opt-in with `'incremental'` mode) — documented in the file-conventions skill segment config table.

### `experimental.authInterrupts`

```ts
experimental: {
  authInterrupts: true,
  // Enables forbidden() and unauthorized() functions in Server Components/Actions
}
```

### `experimental.staleTimes`

```ts
experimental: {
  staleTimes: {
    dynamic: 30,    // seconds — cache for non-prefetched pages (default: 0)
    static: 180,    // seconds — cache for prefetched/static pages (default: 300)
  },
}
```

### `experimental.viewTransition`

```ts
experimental: {
  viewTransition: true,
  // Enables React View Transitions API integration
}
```

### `experimental.serverActions`

```ts
experimental: {
  serverActions: {
    bodySizeLimit: '2mb',   // default '1mb'
    allowedOrigins: ['my-proxy.com'],  // for CSRF protection
  },
}
```

### `experimental.browserDebugInfoInTerminal` (Next.js 16.1)

```ts
experimental: {
  // Boolean form — enable with defaults:
  browserDebugInfoInTerminal: true,

  // Object form — override defaults:
  browserDebugInfoInTerminal: {
    showSourceLocation: true,  // include source file + line in debug output
    depthLimit: 5,             // max nesting depth for circular objects (default: 5)
    edgeLimit: 100,            // max properties for circular object logging (default: 100)
  },
}
```

> Forwards browser-side runtime errors, client warnings, and async errors to the terminal — making them visible to AI agents and CLI-only workflows that cannot open DevTools. Introduced in Next.js 16.1. Default: `false`.

### `experimental.turbopackFileSystemCacheForDev` / `turbopackFileSystemCacheForBuild` (Next.js 16.1)

```ts
experimental: {
  turbopackFileSystemCacheForDev: true,   // default — persistent disk cache for next dev
  turbopackFileSystemCacheForBuild: false, // default — disk cache for next build (experimental)
}
```

> `turbopackFileSystemCacheForDev` is `true` by default in Next.js 16.1. Turbopack compiler artifacts survive across dev server restarts — significant improvement for large projects. `turbopackFileSystemCacheForBuild` enables the same for production builds (opt-in, off by default).

### `experimental.optimizePackageImports`

```ts
experimental: {
  optimizePackageImports: ['lucide-react', '@radix-ui/react-icons', 'date-fns'],
}
```

> Automatically applies the `modularizeImports` optimization to the listed packages. Reduces bundle size for large icon/utility libraries by only importing the specific exports used. Equivalent to manually configuring `modularizeImports` per package.

### `experimental.inlineCss` (Next.js 16)

```ts
experimental: {
  inlineCss: true,
}
```

> Renders `<style>` tags inline in the HTML for imported CSS assets instead of separate `<link rel="stylesheet">` requests. Improves First Contentful Paint for initial page loads. **Supported in App Router production builds only.**

### `experimental.serverComponentsHmrCache`

```ts
experimental: {
  serverComponentsHmrCache: true, // default: true
}
```

> Allows previously fetched `fetch()` data to be re-used when editing Server Components during HMR (Hot Module Replacement). Prevents unnecessary re-fetches of API data on every file save. Default is `true`; set to `false` to always re-fetch on HMR.

### `experimental.globalNotFound`

```ts
experimental: {
  globalNotFound: true,
}
```

> Enables a global `app/global-not-found.tsx` file that catches all `notFound()` calls across the app in a single file — instead of requiring per-segment `not-found.tsx` files. Useful for a single centralized 404 page design.

### `experimental.slowModuleDetection`

```ts
experimental: {
  slowModuleDetection: {
    buildTimeThresholdMs: 500, // Report modules slower to build than this
  },
}
```

> Detects and reports slow-compiling modules during development builds. Helps identify hot paths that could benefit from code splitting or lazy loading. Note: enabling this may slightly impact build performance due to measurement overhead.

### `experimental.turbopackMinify` / `turbopackScopeHoisting`

```ts
experimental: {
  turbopackMinify: true,          // default: true in build, false in dev
  turbopackScopeHoisting: true,   // default: true in build
}
```

> `turbopackMinify` controls Terser-compatible minification during Turbopack builds. `turbopackScopeHoisting` enables scope hoisting (inlines small modules into their importers), reducing bundle size and improving runtime performance. Both default to `true` in production builds.

---

### `experimental.taint`

Enables React's experimental [Data Tainting API](https://react.dev/reference/react/experimental_taintObjectReference) — `taintObjectReference` and `taintUniqueValue` — which prevents specific objects and values from being accidentally passed to Client Components.

```ts
experimental: {
  taint: true,
}
```

Once enabled, import the taint functions from `"next/dist/server/app-render/rsc/taint"` (Server Components only):

```ts
import "server-only";
import {
  taintObjectReference,
  taintUniqueValue,
} from "next/dist/server/app-render/rsc/taint";

// Prevent an entire object from crossing the server/client boundary
taintObjectReference("Do not pass DB user object to client", dbUser);

// Prevent a specific value from being serialized (e.g., API key, secret token)
taintUniqueValue(
  "Do not expose the secret token",
  process, // lifetime — value is tainted as long as this object lives
  process.env.SECRET_TOKEN,
);
```

| Function               | Signature                                                                                              | Description                                                        |
| ---------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------ |
| `taintObjectReference` | `(message: string \| undefined, object: object) => void`                                               | Prevents the entire object from being passed to a Client Component |
| `taintUniqueValue`     | `(message: string \| undefined, lifetime: object, value: string \| bigint \| ArrayBufferView) => void` | Prevents a specific value from crossing the server/client boundary |

> `taintUniqueValue` accepts `string`, `bigint`, or `ArrayBufferView` (e.g., `Buffer`, `Uint8Array`). The `lifetime` parameter ties the taint to the lifetime of a reference object — when that object is GC'd, the taint is lifted.

---

### `experimental.mcpServer` (Next.js 16.1)

Enables a built-in **Model Context Protocol** endpoint at `/_next/mcp` during `next dev`. AI clients (VS Code Copilot, Claude Desktop, Cursor) can connect to it and inspect the running application.

```ts
experimental: {
  mcpServer: true,
  // MCP endpoint available at http://localhost:3000/_next/mcp during `next dev`
}
```

> Enabled automatically in Next.js 16.1+ dev mode. Register the endpoint in `.vscode/mcp.json` for local VS Code Copilot discovery.

---

### `experimental.rootParams` (Next.js 16)

Enables the `next/root-params` module, which exposes root layout `params` to deeply nested Server Components without prop-drilling.

```ts
experimental: {
  rootParams: true,
}
```

```ts
// lib/root-params.ts — server-only
import { unstable_rootParams } from "next/root-params";

export async function getRootParams() {
  return unstable_rootParams(); // returns root layout params (e.g., { lang: 'en' })
}
```

> Useful for i18n layouts where `[lang]` is the root segment and many nested components need the locale without receiving it as a prop.

---

### `experimental.proxyTimeout`, `experimental.proxyClientMaxBodySize`, `experimental.proxyPrefetch`

Configures behaviour of `proxy.ts` (the Next.js 16 replacement for `middleware.ts`).

```ts
experimental: {
  proxyTimeout: 30,                  // Request timeout in seconds (default: 30)
  proxyClientMaxBodySize: "4mb",     // Max incoming body size; same SizeLimit type as bodyParser
  proxyPrefetch: "flexible",         // 'strict' | 'flexible' — prefetch strategy for proxied routes
}
```

| Option                   | Type                           | Default      | Description                                               |
| ------------------------ | ------------------------------ | ------------ | --------------------------------------------------------- |
| `proxyTimeout`           | `number`                       | `30`         | Seconds before a proxied request times out                |
| `proxyClientMaxBodySize` | `SizeLimit` (`number\|string`) | `"4mb"`      | Max body size for requests handled by `proxy.ts`          |
| `proxyPrefetch`          | `'strict' \| 'flexible'`       | `'flexible'` | Controls which links trigger proxy evaluation on prefetch |

> `'strict'` only invokes proxy logic on full navigation; `'flexible'` also evaluates it during link prefetches. Use `'strict'` to reduce proxy overhead when auth guards are not needed during prefetch.

---

### `experimental.allowedRevalidateHeaderKeys`

Specifies which request headers are included in the cache key for `fetch()` calls with `next.revalidate`. By default, `authorization` and `cookie` are included. Override to restrict or extend this set.

```ts
experimental: {
  allowedRevalidateHeaderKeys: ["x-tenant-id", "x-region"],
}
```

> Only headers listed here (beyond the two built-in ones) will vary the cache entry. Adding `x-tenant-id` creates per-tenant caches for multi-tenant apps.

---

### `experimental.cssChunking`

Controls how CSS is chunked in the production bundle.

```ts
experimental: {
  cssChunking: true,       // default — CSS is chunked per route segment
  // cssChunking: 'strict', // stricter deduplication; may break style order in some apps
  // cssChunking: false,   // all CSS in a single bundle (increases initial load)
}
```

> `'strict'` mode applies more aggressive deduplication but can occasionally alter CSS cascade order. Only enable after testing for visual regressions.

---

### `experimental.nextScriptWorkers`

Enables the `strategy="worker"` option in `<Script>` (powered by [Partytown](https://partytown.builder.io/)) to run third-party scripts in a Web Worker instead of the main thread.

```ts
experimental: {
  nextScriptWorkers: true,
}
```

```tsx
import Script from "next/script";
<Script src="https://analytics.example.com/script.js" strategy="worker" />;
```

> Requires installing `@builder.io/partytown` separately. Best for analytics or ad scripts that do not need synchronous DOM access.

---

### `experimental.parallelServerCompiles` / `experimental.parallelServerBuildTraces`

Speeds up `next build` by compiling server routes in parallel and building trace files concurrently.

```ts
experimental: {
  parallelServerCompiles: true,       // compile server route bundles in parallel
  parallelServerBuildTraces: true,    // parallelize build trace generation
}
```

> Both default to `false`. Enable for large apps where `next build` time is dominated by server-side compilation. Server component count and route count determine the speedup; apps with <20 routes see minimal benefit.

---

### `experimental.prerenderEarlyExit`

Enables an optimization that exits prerendering as soon as a dynamic boundary is detected, reducing wasted work during build time.

```ts
experimental: {
  prerenderEarlyExit: true,
}
```

> Particularly useful with PPR (`experimental.ppr`) — Next.js can abort prerendering a static shell the moment it encounters a dynamic API call, rather than waiting for the component tree to fully render.

---

### `experimental.scrollRestoration`

Restores the previous scroll position when navigating back/forward in the browser history.

```ts
experimental: {
  scrollRestoration: true,
}
```

> Uses the History API to save and restore `window.scrollY` on navigation. Without this, Next.js resets scroll to the top on every navigation.

---

### `experimental.optimizeCss`

Enables CSS optimization during `next build` using [Critters](https://github.com/GoogleChromeLabs/critters) to inline critical CSS and defer non-critical stylesheets.

```ts
experimental: {
  optimizeCss: true,
  // or pass Critters options:
  // optimizeCss: { preload: 'media', pruneSource: false },
}
```

> Reduces render-blocking CSS by inlining only the styles required for the initial viewport. Can significantly improve LCP and FCP scores. Requires `critters` to be installed: `pnpm add -D critters`.

---

## Logging

```ts
logging: {
  fetches: {
    fullUrl: true,        // show full URL in server-side fetch logs (default: false)
    hmrRefreshes: false,  // log HMR-cache-restored fetches during dev (default: false)
  },
  incomingRequests: true, // log incoming requests (default: true)
  // Suppress specific routes from incoming request logs:
  // incomingRequests: { ignore: [/^\/_next/, /^\/api\/health/] },
}
// Disable all server logging:
// logging: false,
```

| Sub-option             | Type                               | Default | Description                                           |
| ---------------------- | ---------------------------------- | ------- | ----------------------------------------------------- |
| `fetches.fullUrl`      | `boolean`                          | `false` | Show full URL (including domain) in fetch logs        |
| `fetches.hmrRefreshes` | `boolean`                          | `false` | Log HMR-cache-restored fetches during HMR refreshes   |
| `incomingRequests`     | `boolean \| { ignore?: RegExp[] }` | `true`  | Log incoming requests; use `ignore` to suppress paths |

> Useful for debugging which API calls Next.js deduplicates or caches. `fullUrl: true` paired with `cacheComponents: true` helps trace cache misses. Set `logging: false` to silence all dev server output.

---

## Turbopack

```ts
turbopack: {
  rules: {
    '*.svg': {
      loaders: ['@svgr/webpack'],
      as: '*.js',
    },
    '*.mdx': {
      loaders: ['./my-mdx-loader.js'],
      as: '*.js',
    },
  },
  resolveAlias: {
    underscore: 'lodash',
    mocha: { browser: 'mocha/browser-entry.js' },
  },
  resolveExtensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
  moduleIdStrategy: 'deterministic',  // or 'named'
  treeShaking: true,
  memoryLimit: 4 * 1024,  // MB
},
```

| Option              | Type                                            | Description                                      |
| ------------------- | ----------------------------------------------- | ------------------------------------------------ |
| `rules`             | `Record<string, TurboRule>`                     | Custom loader rules for file patterns            |
| `resolveAlias`      | `Record<string, string \| { browser: string }>` | Module aliases                                   |
| `resolveExtensions` | `string[]`                                      | File extensions to resolve (overwrites defaults) |
| `moduleIdStrategy`  | `'deterministic' \| 'named'`                    | Module ID generation                             |
| `treeShaking`       | `boolean`                                       | Enable/disable tree shaking                      |
| `memoryLimit`       | `number`                                        | Memory limit in MB                               |

> **Note**: Turbopack is the **default bundler for both `next dev` and `next build`** in Next.js 16. The `--turbopack` flag is no longer needed — it will be ignored. To opt out and use webpack, pass `--no-turbopack` to the CLI command.

---

## Runtime & Packages

### `serverExternalPackages`

```ts
serverExternalPackages: ["@prisma/client", "bcrypt", "sharp"];
// Excludes packages from Server Component bundling
// Must be used for native modules or packages with binary dependencies
```

### `transpilePackages`

```ts
transpilePackages: ["@acme/ui", "some-esm-only-package"];
// Force transpilation of packages from node_modules
// Useful for monorepo packages and ESM-only third-party packages
```

### `bundlePagesRouterDependencies`

```ts
bundlePagesRouterDependencies: true;
// Bundle node_modules for Pages Router (like serverComponentsExternalPackages inverse)
```

---

## TypeScript

```ts
typescript: {
  ignoreBuildErrors: false,  // default; true → skip type-check during build
  tsconfigPath: './tsconfig.json',  // custom tsconfig path
}
```

> Use `ignoreBuildErrors: true` only in CI where you run `tsc` separately. Never in production without explicit type validation.

## ESLint

> **Next.js 16**: The `eslint` config option has been **removed** from `next.config.js`. Use the ESLint CLI directly (`eslint .`) with an `eslint.config.mjs` file. Run `pnpm dlx @next/codemod@canary next-lint-to-eslint-cli .` to migrate automatically.

```bash
# Replaced by direct ESLint CLI usage
# eslint: { ignoreDuringBuilds, dirs } — REMOVED
```

---

## Testing Config with `unstable_getResponseFromNextConfig`

```ts
import {
  getRedirectUrl,
  unstable_getResponseFromNextConfig,
} from "next/experimental/testing/server";

const response = await unstable_getResponseFromNextConfig({
  url: "https://example.com/test",
  nextConfig: {
    async redirects() {
      return [{ source: "/test", destination: "/new", permanent: false }];
    },
  },
});
// response.status === 307
// getRedirectUrl(response) === 'https://example.com/new'
```

---

## Quick Reference

| Option                                          | Category    | Notes                                                         |
| ----------------------------------------------- | ----------- | ------------------------------------------------------------- |
| `basePath`                                      | Routing     | Build-time only                                               |
| `trailingSlash`                                 | Routing     | Affects all routes                                            |
| `assetPrefix`                                   | Routing     | CDN prefix for static assets                                  |
| `headers()`                                     | Routing     | Custom response headers                                       |
| `redirects()`                                   | Routing     | 307/308 redirects                                             |
| `rewrites()`                                    | Routing     | URL rewrites (no redirect)                                    |
| `output`                                        | Build       | `'standalone'` / `'export'`                                   |
| `distDir`                                       | Build       | Build output directory                                        |
| `compress`                                      | Build       | gzip for SSR (disable for proxy)                              |
| `poweredByHeader`                               | Build       | Remove `X-Powered-By` header                                  |
| `images`                                        | Assets      | Full optimization config                                      |
| `cacheComponents`                               | Rendering   | Next.js 16 (replaces `dynamicIO`)                             |
| `reactStrictMode`                               | Rendering   | Strict mode checks                                            |
| `reactCompiler`                                 | Rendering   | Auto-memoization; stable in Next.js 16                        |
| `typedRoutes`                                   | TypeScript  | Type-safe `<Link>` and `router.push()`; stable in v16         |
| `images.maximumRedirects`                       | Assets      | Max image redirects (default `3`, new in v16.1.6)             |
| `experimental.authInterrupts`                   | Auth        | Enables `forbidden()`/`unauthorized()`                        |
| `experimental.staleTimes`                       | Cache       | Router cache TTL (dynamic/static)                             |
| `experimental.viewTransition`                   | UX          | View Transitions API                                          |
| `experimental.browserDebugInfoInTerminal`       | DX          | Forward browser errors to terminal (Next.js 16.1)             |
| `experimental.turbopackFileSystemCacheForDev`   | Build       | Turbopack disk cache for dev (default `true` in Next.js 16.1) |
| `experimental.turbopackFileSystemCacheForBuild` | Build       | Turbopack disk cache for build (default `false`)              |
| `experimental.optimizePackageImports`           | Build       | Auto tree-shake large packages via modularizeImports          |
| `experimental.inlineCss`                        | Performance | Inline CSS into HTML for faster FCP (App Router prod only)    |
| `experimental.serverComponentsHmrCache`         | DX          | Re-use fetch data across HMR reloads (default `true`)         |
| `experimental.globalNotFound`                   | Routing     | Single global `app/global-not-found.tsx` for all 404s         |
| `experimental.slowModuleDetection`              | DX          | Report modules above build-time threshold                     |
| `experimental.turbopackMinify`                  | Build       | Turbopack minification (default `true` in prod)               |
| `experimental.turbopackScopeHoisting`           | Build       | Module scope hoisting for smaller bundles (default `true`)    |
| `turbopack`                                     | Build       | Turbopack-specific configuration                              |
| `logging`                                       | DX          | Dev server fetch + incoming request logging                   |
| `serverExternalPackages`                        | Runtime     | Exclude from server bundle                                    |
| `transpilePackages`                             | Runtime     | Force transpile node_modules                                  |
| `typescript.ignoreBuildErrors`                  | TypeScript  | Skip build-time type-check                                    |
| ~~`eslint`~~                                    | ESLint      | **Removed in Next.js 16** — use ESLint CLI directly           |

---

## See Also

- `references/next-config-options.md` — Exhaustive sub-option details, `has`/`missing` matcher syntax, Turbopack loader rules reference
- `nextjs-directives` skill — `'use cache'`, `'use client'`, `'use server'` directives
- `nextjs-components` skill — `<Image>`, `<Link>`, `<Script>` components
