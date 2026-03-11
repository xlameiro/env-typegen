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

### Phase-based async config

Export an **async function** that receives the current build `phase` to vary config per environment. Phase constants are imported from `"next/constants"`.

```ts
// next.config.ts
import type { NextConfig } from "next";
import {
  PHASE_DEVELOPMENT_SERVER,
  PHASE_PRODUCTION_BUILD,
  PHASE_PRODUCTION_SERVER,
  PHASE_TEST,
} from "next/constants";

export default async function config(phase: string): Promise<NextConfig> {
  const isDev = phase === PHASE_DEVELOPMENT_SERVER;
  const isTest = phase === PHASE_TEST;

  return {
    reactStrictMode: true,
    // Only enable bundle analyzer in production builds
    ...(phase === PHASE_PRODUCTION_BUILD && {
      env: { ANALYZE: "true" },
    }),
    experimental: {
      // Disable MCP server outside dev
      mcpServer: isDev,
    },
  };
}
```

| Phase constant             | When it is active                          |
| -------------------------- | ------------------------------------------ |
| `PHASE_DEVELOPMENT_SERVER` | `next dev`                                 |
| `PHASE_PRODUCTION_BUILD`   | `next build`                               |
| `PHASE_PRODUCTION_SERVER`  | `next start` (production server)           |
| `PHASE_TEST`               | Test runner (Vitest/Jest) with `next/jest` |
| `PHASE_EXPORT`             | `next export` (static export)              |
| `PHASE_ANALYZE`            | `@next/bundle-analyzer` build              |

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

### `reactMaxHeadersLength`

Limits the total byte length of HTTP headers emitted by React's SSR pipeline (used by RSC and Suspense streaming). Prevents oversized header responses that could be rejected by reverse proxies or CDNs.

```ts
reactMaxHeadersLength: 6000; // default — ~6 KB
```

> Most CDNs and HTTP/2 servers have a 8–16 KB header limit. The default of `6000` bytes leaves headroom. Only increase if you are intentionally passing large amounts of metadata through RSC headers and have verified your infrastructure handles the size.

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

---

### `experimental.useCache` (Legacy)

A precursor to the top-level `cacheComponents` option. When `true`, enables the `"use cache"` directive **without** turning on the full PPR / Cache Components pipeline. Introduced in Next.js 15's `dynamicIO` experiment.

```ts
experimental: {
  useCache: true,  // default: undefined (not enabled)
}
```

> **Prefer `cacheComponents: true`** (top-level, stable in Next.js 16) — it supersedes `experimental.useCache`. Use `experimental.useCache` only when migrating an existing Next.js 15 app that used `dynamicIO` and you need a step-by-step transition without enabling full PPR immediately.

---

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

---

### `experimental.maxPostponedStateSize`

Sets the **maximum size** of the postponed state body for PPR resume requests. This includes the Resume Data Cache (RDC), which can grow large for applications with many dynamic segments using `use cache`.

```ts
experimental: {
  ppr: true,
  maxPostponedStateSize: '100mb',  // default: '100mb'
}
```

> Increase this limit if you see `MaxPostponedStateSizeExceeded` errors in production for pages with large dynamic payloads. The limit applies per request. Accepted values follow the `SizeLimit` format (`'50mb'`, `104857600`, etc.).

---

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

---

### `experimental.clientRouterFilter`, `experimental.clientRouterFilterRedirects`, `experimental.clientRouterFilterAllowedRate`

At build time, Next.js generates a **bloom filter** from all known app routes (and optionally redirect sources). This filter is embedded in the client bundle so the client-side router can quickly determine whether a URL is a recognized route — avoiding unnecessary prefetch requests or server round-trips for unknown paths.

```ts
experimental: {
  clientRouterFilter: true,              // default: true — enable bloom filter
  clientRouterFilterRedirects: false,    // default: false — also include redirect source paths
  clientRouterFilterAllowedRate: 0.01,   // false-positive rate (0–1, default: ~0.01)
}
```

| Option                          | Type      | Default | Description                                                        |
| ------------------------------- | --------- | ------- | ------------------------------------------------------------------ |
| `clientRouterFilter`            | `boolean` | `true`  | Generates and embeds a bloom filter of known routes in the bundle  |
| `clientRouterFilterRedirects`   | `boolean` | `false` | Also includes redirect source paths in the filter                  |
| `clientRouterFilterAllowedRate` | `number`  | `~0.01` | Bloom filter false-positive rate; lower = larger filter, fewer FPs |

> Disable (`false`) only if you have an unusually large number of routes causing bundle size issues. In most apps this filter is tiny and has no measurable impact.

---

### `experimental.viewTransition`

```ts
experimental: {
  viewTransition: true,
  // Enables React View Transitions API integration
}
```

### `experimental.dynamicOnHover`

```ts
experimental: {
  dynamicOnHover: true,  // default: false
}
```

> When enabled, hovering over a `<Link>` **upgrades the prefetch from static to dynamic** — Next.js fetches the full RSC payload (including dynamic data) on hover rather than waiting for a click. Result: near-instant navigation for links the user is about to click, at the cost of extra server requests on hover. Best enabled on pages where link targets have dynamic content that the static prefetch would miss. Default: `false`.

| Value   | Prefetch on hover? | What is prefetched              |
| ------- | ------------------ | ------------------------------- |
| `false` | Static only        | Static shell (no dynamic data)  |
| `true`  | Dynamic            | Full RSC payload + dynamic data |

> Relates to `staleTimes` — the hover-fetched payload respects `staleTimes.dynamic` TTL.

---

### `experimental.testProxy` / `experimental.defaultTestRunner`

Part of the `next experimental-test` command workflow. `testProxy` routes all `fetch()` calls inside tests through an internal proxy server, enabling request interception and mocking without patching Node.js globals. `defaultTestRunner` sets the test runner invoked by `next experimental-test`.

```ts
experimental: {
  testProxy: true,                   // default: false (undefined)
  defaultTestRunner: 'playwright',   // only supported value as of Next.js 16.1.6
}
```

```bash
# Runs your test files through the Next.js test proxy
npx next experimental-test
```

> `testProxy` enables the interceptable fetch proxy that `next experimental-test` uses to assert on HTTP calls made by Server Actions and Route Handlers during testing. Enable only in test environments — it adds request overhead and is not designed for production use.

---

### `experimental.optimisticClientCache`

When `true` (default), Next.js **caches prefetch responses on the client** for the duration of a navigation session. If a `<Link>` target was already prefetched, subsequent hover events on the same link will NOT trigger a new prefetch request — the cached response is reused.

```ts
experimental: {
  optimisticClientCache: true,  // default: true
}
```

> Set to `false` if you need prefetch responses to always be fresh — for example, in apps where the content of a route can change rapidly and a stale prefetch would display visually outdated data on hover. Disabling this increases server load from repeated `<Link>` prefetches.

---

### `experimental.appNavFailHandling`

When enabled, the App Router registers `window.addEventListener('unhandledrejection')` and `window.addEventListener('error')` listeners. If an unhandled exception occurs **during a client-side navigation**, the handler triggers a **hard navigation** (full page reload) to recover to a usable state.

```ts
experimental: {
  appNavFailHandling: true,  // default: false
}
```

> Useful for production apps where transient JS errors during navigation would otherwise leave the user stranded on a broken client-side state. The entire handler is dead-code-eliminated from the bundle when `false`.

---

### `experimental.linkNoTouchStart`

Disables the `onTouchStart` prefetch handler on `<Link>` components. By default, `<Link>` prefetches on both **hover** (desktop) and **touchstart** (mobile). Setting this to `true` removes the touchstart trigger — only hover/focus initiates prefetching.

```ts
experimental: {
  linkNoTouchStart: true,  // default: false
}
```

> Use when mobile touchstart-driven prefetches cause excessive network requests or unwanted server load. With this enabled, mobile users will not get prefetched pages until they complete navigation.

---

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

---

### `experimental.reactDebugChannel`

In development mode only, sends the React debug info payload through a **WebSocket connection** rather than embedding it in the main RSC response. Reduces RSC payload size during development and decouples debugging data from the render stream.

```ts
experimental: {
  reactDebugChannel: true,  // default: false
}
```

> Has no effect in production (`next build`). Useful when profiling RSC payload size in development — separating debug info from the main stream gives a more accurate picture of what will be sent in production.

---

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

### `experimental.webVitalsAttribution`

Specifies which Web Vitals metrics should include **attribution data** (source element, cause, timing breakdown) when reported via `useReportWebVitals`. Valid values are the six Core Web Vitals metric names.

```ts
experimental: {
  webVitalsAttribution: ['CLS', 'LCP', 'INP'],
  // full set: ['CLS', 'FCP', 'FID', 'INP', 'LCP', 'TTFB']
}
```

| Metric | Full Name                 | What attribution adds                         |
| ------ | ------------------------- | --------------------------------------------- |
| `CLS`  | Cumulative Layout Shift   | Element and its shift rectangle               |
| `FCP`  | First Contentful Paint    | n/a (not supported)                           |
| `FID`  | First Input Delay         | Event target element                          |
| `INP`  | Interaction to Next Paint | Event target + timing breakdown               |
| `LCP`  | Largest Contentful Paint  | Element, URL, time to first byte, render time |
| `TTFB` | Time to First Byte        | Navigation timing phases                      |

> When `webVitalsAttribution` includes a metric, the `metric.attribution` object in `useReportWebVitals` will be populated with source details (e.g., `metric.attribution.largestContentfulPaintElement`). Without this option, `metric.attribution` is `undefined`. See `nextjs-app-router-patterns` skill § `useReportWebVitals` for the hook API.

### `experimental.optimizeServerReact`

Applies React-specific compiler optimizations for **server builds** — reduces dead code in the server bundle by removing client-only React internals and event system code.

```ts
experimental: {
  optimizeServerReact: true,  // default: true in production
}
```

> Enabled by default in production builds. Set to `false` only when `optimizeServerReact` causes mismatches with third-party libraries that rely on React client internals being present at import time. Most projects should leave this at the default.

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

### `experimental.turbopackMemoryLimit`

Sets a **target memory limit** (in bytes) for the Turbopack compiler. When memory usage approaches this limit, Turbopack will attempt to free cached data to stay within bounds.

```ts
experimental: {
  turbopackMemoryLimit: 4 * 1024 ** 3,  // 4 GB in bytes; default: undefined (no limit)
}
```

> Useful on CI machines or containers where memory is constrained. Turbopack will trade build speed for memory when approaching the limit. Set to `0` to disable memory management entirely.

---

### `experimental.turbopackClientSideNestedAsyncChunking` / `turbopackServerSideNestedAsyncChunking`

Controls **nested async chunk computation** for Turbopack. When enabled, Turbopack pre-computes all possible paths through dynamic imports and determines the minimal set of modules needed at each dynamic import boundary — producing smaller, more optimal chunk groups at runtime.

```ts
experimental: {
  // Client: defaults to true in build mode, false in dev mode
  turbopackClientSideNestedAsyncChunking: true,
  // Server: defaults to false in both dev and build
  turbopackServerSideNestedAsyncChunking: false,
}
```

> `turbopackClientSideNestedAsyncChunking: true` in build mode reduces JS loaded at dynamic import points by computing every possible traversal path. Leaving it `false` in dev keeps HMR fast. The server-side variant is more expensive and stays off by default.

---

### `experimental.turbopackImportTypeBytes`

Enables support for the `with { type: 'module' }` assertion on ESM `import` statements when using Turbopack.

```ts
experimental: {
  turbopackImportTypeBytes: true,  // default: undefined (disabled)
}
```

> Only enable if your project uses typed ESM imports such as `import data from './data.json' with { type: 'json' }`. This is an evolving ESM standard; browser support continues to expand.

---

### `experimental.turbopackSourceMaps` / `turbopackInputSourceMaps`

Controls source map behavior in Turbopack.

| Option                     | Default | Description                                                                                |
| -------------------------- | ------- | ------------------------------------------------------------------------------------------ |
| `turbopackSourceMaps`      | `true`  | Generate source maps for all compiled outputs                                              |
| `turbopackInputSourceMaps` | `true`  | Extract and remap source maps from input files, chaining them through every transform step |

```ts
experimental: {
  turbopackSourceMaps: true,       // default: true
  turbopackInputSourceMaps: true,  // default: true
}
```

> Set `turbopackSourceMaps: false` to skip generating source maps (smaller output, faster CI builds). Set `turbopackInputSourceMaps: false` to disable source map chaining — transformed code will map to the post-transform result rather than the original authored source.

---

### `experimental.turbopackModuleIds`

Controls the **module ID format** used by Turbopack when referencing JavaScript modules internally.

```ts
experimental: {
  turbopackModuleIds: 'deterministic',  // 'named' | 'deterministic'
}
```

| Value             | Default in  | Description                                                            |
| ----------------- | ----------- | ---------------------------------------------------------------------- |
| `'named'`         | Development | Human-readable IDs (e.g. `./components/button.tsx`) — easiest to debug |
| `'deterministic'` | Production  | Short stable hash IDs — smaller bundle, consistent between builds      |

> Setting `'deterministic'` in development can speed up HMR in large monorepos at the cost of debuggability. Setting `'named'` in production exposes internal file paths and increases bundle size — avoid unless actively debugging a production build.

---

### `experimental.turbopackTreeShaking` / `turbopackRemoveUnusedImports` / `turbopackRemoveUnusedExports`

Dead code elimination options for Turbopack beyond standard bundler behavior.

| Option                         | Default     | Description                                                    |
| ------------------------------ | ----------- | -------------------------------------------------------------- |
| `turbopackTreeShaking`         | `undefined` | Enable tree shaking in both the Turbopack dev server and build |
| `turbopackRemoveUnusedImports` | `undefined` | Remove unused `import` statements from compiled modules        |
| `turbopackRemoveUnusedExports` | `undefined` | Remove unused `export` declarations from compiled modules      |

```ts
experimental: {
  turbopackTreeShaking: true,
  turbopackRemoveUnusedImports: true,
  turbopackRemoveUnusedExports: true,
}
```

> These options are more aggressive than Turbopack's built-in defaults. `turbopackTreeShaking` eliminates unreachable code paths; `turbopackRemoveUnusedImports` and `turbopackRemoveUnusedExports` strip dead module-level declarations. All three are `undefined` by default, meaning Turbopack uses its own per-mode heuristics.

---

### `experimental.turbopackUseBuiltinBabel` / `turbopackUseBuiltinSass` / `turbopackUseSystemTlsCerts`

Turbopack integration options for Babel, Sass, and HTTPS certificate authorities.

```ts
experimental: {
  turbopackUseBuiltinBabel: true,      // default: true
  turbopackUseBuiltinSass: true,       // default: true
  turbopackUseSystemTlsCerts: false,   // default: false
}
```

**`turbopackUseBuiltinBabel`** — When `true` (default), Turbopack automatically configures `babel-loader` whenever a Babel configuration file (`.babelrc`, `babel.config.js`) is detected in the project. Set `false` to opt out. Note: if `reactCompiler: true`, the React Compiler Babel plugin still runs regardless of this flag, but project-level `.babelrc` transforms are skipped.

**`turbopackUseBuiltinSass`** — When `true` (default), Turbopack automatically configures `sass-loader` for `.scss` / `.sass` files when the `sass` package is installed. Set `false` to supply a custom loader via Turbopack rule overrides.

**`turbopackUseSystemTlsCerts`** — When `true`, Turbopack uses [`rustls-native-certs`](https://crates.io/crates/rustls-native-certs) instead of its bundled CAs for outbound HTTPS requests (e.g., downloading Google Fonts at build time). Useful in environments with custom root CAs (corporate proxies, self-signed certificates).

```bash
# Can also be set via environment variable:
NEXT_TURBOPACK_EXPERIMENTAL_USE_SYSTEM_TLS_CERTS=1 pnpm dev
```

> `turbopackUseSystemTlsCerts` is experimental pending resolution of [seanmonstar/reqwest#2159](https://github.com/seanmonstar/reqwest/issues/2159). The flag is silently ignored on Windows ARM targets.

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

### `experimental.useSkewCookie`

When enabled alongside `deploymentId`, injects a `Set-Cookie: __vdpl=<deploymentId>; Path=/; HttpOnly` response header on every request. This cookie lets your CDN or load balancer route returning users back to the **same deployment version**, preventing _deployment skew_ — the race condition where a user loads JS assets from deployment A then makes RSC data requests to deployment B.

```ts
// next.config.ts
const nextConfig: NextConfig = {
  deploymentId: process.env.DEPLOYMENT_ID, // unique string per deploy (e.g. git SHA)
  experimental: {
    useSkewCookie: true, // default: false
  },
};
```

> When `useSkewCookie: true`, the `deploymentId` is **not** baked into the client JS bundle (keeping builds reproducible across instances). Skew protection is handled entirely at the CDN/proxy layer via the cookie. Requires `deploymentId` to be set — the cookie is a no-op if `deploymentId` is absent.

---

### `experimental.runtimeServerDeploymentId`

When `true`, `process.env.NEXT_DEPLOYMENT_ID` is resolved at **runtime** on the server rather than being baked into the build output at build time.

```ts
const nextConfig: NextConfig = {
  deploymentId: process.env.DEPLOYMENT_ID,
  experimental: {
    runtimeServerDeploymentId: true, // default: false
  },
};
```

> Useful in immutable build artifact workflows where the same build is promoted across environments (staging → production). Without this, `deploymentId` must be known at build time and is embedded in the bundle; with it, the ID is read from the environment at server start, so the build artifact stays identical.

---

### `experimental.adapterPath`

Path to a **deployment adapter module** that exports a `modifyConfig(config, { phase })` function. When set, Next.js calls this function during config loading to allow deployment platforms to inject or override configuration values declaratively.

```ts
experimental: {
  adapterPath: './adapters/my-platform-adapter.js',
  // default: process.env.NEXT_ADAPTER_PATH || undefined
}
```

```ts
// adapters/my-platform-adapter.js
export const name = "my-platform";
export async function modifyConfig(config, { phase }) {
  // Mutate or return a modified config for the given build phase
  return { ...config, compress: false };
}
```

> Typically set via the `NEXT_ADAPTER_PATH` environment variable by the deployment platform — not manually by application developers. Used by platforms like Vercel to inject telemetry, output modes, or cache behavior. If you are an end user, this option is unlikely to improve your Next.js config directly.

---

### `experimental.validateRSCRequestHeaders`

During RSC (React Server Component) requests, validates that the request headers match the cache-busting search parameter sent by the client. Prevents serving a cached RSC payload to a mismatched request.

```ts
experimental: {
  validateRSCRequestHeaders: true,  // default: true
}
```

> Rarely needs to be changed. Set to `false` only when debugging RSC cache matching issues or if a non-standard proxy strips the cache-busting parameter from RSC requests.

---

### `experimental.removeUncaughtErrorAndRejectionListeners`

When `true`, removes the global `unhandledRejection` and `uncaughtException` process listeners that Next.js registers by default. Useful in deployment environments (AWS Lambda, containers) where the platform's own error handler should control process exit behavior.

```ts
experimental: {
  removeUncaughtErrorAndRejectionListeners: true,  // default: false
}
```

> The default Next.js listeners prevent the process from exiting on unhandled errors, which can interfere with platforms that rely on uncaught errors to trigger restarts or health checks. This is experimental until the impact on various deployment environments is well-understood.

---

### `experimental.clientTraceMetadata`

An array of **HTTP header names** whose values are injected into client-side OpenTelemetry trace spans. Enables distributed trace correlation between server-side trace propagation headers (e.g., `traceparent`, `x-b3-traceid`) and client-initiated spans.

```ts
experimental: {
  clientTraceMetadata: ['traceparent', 'tracestate', 'x-b3-traceid'],
  // default: undefined (no headers forwarded)
}
```

> Requires an OpenTelemetry SDK configured on both server and client. The listed headers are read from the server response and forwarded as trace attributes — enabling full distributed traces across SSR → client transitions. Only include headers that are safe to expose to the browser.

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

### `experimental.clientParamParsingOrigins`

Allowlist of **origin patterns** (regex strings) for non-relative rewrites. When a rewrite destination is a non-relative URL (different origin), Next.js will only propagate URL search parameters to the destination if the destination origin matches one of the listed patterns.

```ts
experimental: {
  clientParamParsingOrigins: [
    'https://api\.example\.com',
    'https://.*\.internal\.com',
  ],
}
```

> Prevents untrusted upstream origins from receiving query parameters through rewrites. If `undefined` (default), no non-relative rewrite will receive parsed parameters. Set this for any multi-origin proxy architecture that requires parameter forwarding.

---

### `experimental.fetchCacheKeyPrefix`

A string prefix prepended to all `fetch()` cache keys generated by Next.js. Useful in **multi-tenant or multi-zone applications** where different tenants share the same Next.js server but must have isolated caches.

```ts
experimental: {
  fetchCacheKeyPrefix: 'tenant-a:',  // default: ''
}
```

> Prefix is prepended before hashing — ensures tenant A's `fetch('/api/data')` resolves to a different cache entry than tenant B's identical call. Combine with `allowedRevalidateHeaderKeys` for header-based cache partitioning.

---

### `experimental.isrFlushToDisk`

Controls whether ISR (Incremental Static Regeneration) pages are written to disk after revalidation. When `false`, regenerated pages are served from memory only and not persisted to the filesystem.

```ts
experimental: {
  isrFlushToDisk: false,  // default: true
}
```

> Set to `false` in read-only filesystem environments (e.g., certain containerized deployments, AWS Lambda) where disk writes are not available or desired. Pages still serve from memory cache; only the disk persistence step is skipped.

---

### `experimental.largePageDataBytes`

The byte threshold above which Next.js emits a warning about large initial page data (`getServerSideProps` / `getStaticProps` return values). Useful for tuning or silencing the warning in apps with legitimately large payloads.

```ts
experimental: {
  largePageDataBytes: 256 * 1000,  // default: 128_000 (125 KB)
}
```

> The warning helps catch unintentional over-fetching — e.g., sending large lists when pagination would suffice. Double the threshold only after verifying the size is intentional.

---

### `experimental.imgOptConcurrency`

Caps the number of **concurrent image optimization requests** processed by the built-in image server. By default there is no limit (`null`), which means incoming requests are queued only by the underlying Node.js event loop.

```ts
experimental: {
  imgOptConcurrency: 4,  // default: null (unlimited)
}
```

> Set a limit on memory-constrained servers where each sharp call allocates significant heap. A value of `4–8` is a reasonable starting point for typical App Runner / Lambda deployments.

---

### `experimental.imgOptTimeoutInSeconds`

Maximum number of seconds the image optimization server will wait for a single image to be processed before returning a 503.

```ts
experimental: {
  imgOptTimeoutInSeconds: 15,  // default: 7
}
```

> Increase if you serve very large source images (prints, high-res photography) that legitimately take more than 7 s to optimize. Clients that exceed the timeout receive the original unoptimized image as a fallback.

---

### `experimental.imgOptMaxInputPixels`

Largest source image (in total pixels, `width × height`) that the image optimization server will accept. Requests exceeding this limit are rejected immediately, protecting the server from decompression-bomb attacks.

```ts
experimental: {
  imgOptMaxInputPixels: 100_000_000,  // default: 268_402_689 (~16383×16383 px)
}
```

> The default (`268_402_689`) equals `(2^14 - 1)^2` — the maximum size sharp can handle. Lower this if you want an earlier safety valve for unexpectedly large user-uploaded images.

---

### `experimental.imgOptSequentialRead`

Forces sharp (the underlying image processing library) to read source images **sequentially** rather than randomly. Beneficial for spinning-disk storage where random seeks are expensive.

```ts
experimental: {
  imgOptSequentialRead: true,  // default: null (let sharp decide)
}
```

> Only relevant when Next.js serves images from a network-attached or spinning-disk filesystem. Has no measurable effect on SSDs or cloud object storage (S3, GCS).

---

### `experimental.imgOptSkipMetadata`

Instructs sharp to **skip reading and preserving** EXIF/XMP metadata when optimizing images, reducing memory usage and processing time at the cost of stripping metadata from the output.

```ts
experimental: {
  imgOptSkipMetadata: true,  // default: null (preserve metadata)
}
```

> Safe to enable for most web applications where EXIF data serves no user-facing purpose. Do **not** enable if your app displays GPS coordinates, camera settings, or any metadata extracted from image files.

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

### `experimental.disableOptimizedLoading`

Changes how Next.js emits `<script>` tags in the Pages Router HTML document. When `false` (default), scripts use `defer` — they execute after the HTML is parsed, in order. When `true`, scripts use `async` — they execute as soon as downloaded, potentially out-of-order.

```ts
experimental: {
  disableOptimizedLoading: true,  // default: false
}
```

> **App Router is unaffected** — this option only applies to Pages Router (`_document.tsx`). The `defer` default (optimized loading) is correct for almost all cases; set to `true` only if you have a specific reason to use `async` script execution semantics.

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

### `experimental.mdxRs`

Enables the [**Rust-based MDX compiler**](https://nextjs.org/docs/app/api-reference/next-config-js/mdxRs) for `@next/mdx`. Significantly faster than the JavaScript MDX compiler for large documentation sites.

```ts
experimental: {
  // Basic boolean form:
  mdxRs: true,

  // Object form for fine-grained control:
  mdxRs: {
    development: false,        // only compile in production (default: on in all modes)
    jsx: true,                 // output JSX instead of React.createElement calls
    jsxRuntime: 'automatic',   // 'classic' | 'automatic'
    jsxImportSource: 'react',  // import source for automatic JSX runtime
    providerImportSource: '@mdx-js/react',  // MDX provider for custom components
    mdxType: 'gfm',            // 'gfm' (GitHub Flavored Markdown) | 'commonmark'
  },
}
```

> Requires `@next/mdx` to be installed (`pnpm add @next/mdx`). This option only affects **compilation speed** — the output is identical to the JS compiler. Use `mdxType: 'gfm'` for docs sites built from GitHub READMEs; use `'commonmark'` for stricter CommonMark compliance.

---

### `experimental.workerThreads`

Enables Node.js **worker_threads** for parallel TypeScript type checking and SWC compilation during `next build`. On multi-core machines, this can meaningfully reduce build time for type-heavy projects.

```ts
experimental: {
  workerThreads: true,  // default: false
}
```

> Passed as `enableWorkerThreads` to both the TypeScript verification pipeline and the SWC compiler. Has no effect on `next dev`. Pairs well with `parallelServerCompiles` and `parallelServerBuildTraces` for maximum build parallelism.

---

### `experimental.memoryBasedWorkersCount`

When `true`, Next.js automatically scales the number of build worker processes based on **available system memory** rather than CPU count alone. Prevents OOM kills on systems where CPU count exceeds what memory can comfortably support.

```ts
experimental: {
  memoryBasedWorkersCount: true,  // default: false
}
```

> Particularly useful in CI pipelines with many cores but limited RAM (e.g., GitHub Actions runners reporting 32 cores but only 7 GB RAM). When enabled, the worker count formula uses `min(cpus, floor(memory / perWorkerEstimate))` to avoid over-scheduling.

---

### `experimental.preloadEntriesOnStart`

In production (non-dev, non-minimal mode), calls `unstable_preloadEntries()` during server initialization to **warm up route entry caches** before the first real request arrives. Reduces cold-start latency for serverless deployments or freshly-started containers.

```ts
experimental: {
  preloadEntriesOnStart: true,  // default: true
}
```

> Set to `false` to skip the warm-up phase when cold-start latency is not a concern (e.g., long-lived Node.js processes where the first request timing is not critical) or when startup time itself must be minimized.

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

### `experimental.transitionIndicator`

Shows a loading bar indicator during client-side View Transition navigations. Requires `experimental.viewTransition: true`.

```ts
experimental: {
  viewTransition: true,
  transitionIndicator: true,  // default: false
}
```

> The indicator renders as an animated progress bar at the top of the viewport — similar to NProgress. Enable alongside `viewTransition` for a polished navigation experience.

---

### `experimental.typedEnv`

Generates TypeScript types for `process.env` based on all environment variables declared in `.env*` files. Eliminates `string | undefined` widening on known env vars.

```ts
experimental: {
  typedEnv: true,  // default: false
}
```

After enabling, `pnpm type-check` will produce a `next-env.d.ts` augmentation that narrows `process.env.MY_VAR` from `string | undefined` to `string` when the variable is declared. Import validated env vars from `@/lib/env` as usual — `typedEnv` only improves editor autocomplete; it does NOT validate at runtime.

---

### `experimental.turbopackInferModuleSideEffects`

Enables Turbopack's side effect inference for better tree-shaking. Defaults to `true` in canary builds, `false` in stable.

```ts
experimental: {
  turbopackInferModuleSideEffects: true,
}
```

> When enabled, Turbopack infers which modules are side-effect-free (analogous to `"sideEffects": false` in `package.json`) and can remove unused exports more aggressively. Effective for packages that don't declare `sideEffects` in their `package.json`.

---

### `experimental.isolatedDevBuild`

Runs dev server compilation in an isolated worker process (default: `true`). Prevents compilation crashes from affecting the dev server process itself.

```ts
experimental: {
  isolatedDevBuild: false,  // disable if you hit IPC-overflow issues in dev
}
```

> Setting `false` runs compilations in the main dev server process — may help debugging complex server crash scenarios but is generally not recommended.

---

### `experimental.hideLogsAfterAbort`

Suppresses server-side log output when a streaming response is aborted by the client (e.g., user navigates away mid-render). Reduces noise in production server logs. Default: `false`.

```ts
experimental: {
  hideLogsAfterAbort: true,
}
```

### `experimental.sri` — Subresource Integrity

Adds cryptographic hash attributes (`integrity`) to all `<script>` and `<link rel="stylesheet">` tags emitted by Next.js. Enables [Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP) (CSP) `require-sri-for` directives and protects against supply-chain attacks from CDN or proxy tampering.

```ts
experimental: {
  sri: {
    algorithm: 'sha256',  // 'sha256' | 'sha384' | 'sha512'
  },
}
```

> Use `sha256` for broad support. `sha384` or `sha512` offer stronger guarantees. When enabled, the `integrity` attribute is added to every emitted script/style — pair this with a `Content-Security-Policy` header that includes `require-sri-for script style`. Only applies to hashes Next.js controls; third-party `<Script>` tags loaded by the browser at runtime are NOT covered.

### `experimental.caseSensitiveRoutes`

Makes the routing layer **case-sensitive** for URL paths. When `false` (default), `/About` and `/about` resolve to the same page. When `true`, they are treated as distinct routes — matches production behavior on Linux/macOS filesystems.

```ts
experimental: {
  caseSensitiveRoutes: true,  // default: false
}
```

> Enable in production to surface case-sensitivity bugs during development (macOS HFS+ is case-insensitive by default, masking issues that only appear on Linux in CI/CD). Useful when routing to user-generated slugs where case matters for identity.

---

### `experimental.multiZoneDraftMode`

Preserves **Draft Mode** (preview mode) cookies when navigating across **Next.js multi-zone setups** (multiple Next.js apps sharing the same domain via different path prefixes). Without this, crossing zone boundaries clears the preview cookies — breaking CMS draft mode for editors.

```ts
experimental: {
  multiZoneDraftMode: true,  // default: false
}
```

> Enable on every zone in a multi-zone deployment when using Draft Mode for CMS preview. Without it, an editor navigating from zone A (`/`) to zone B (`/blog`) would have their draft mode silently cleared by zone B's preview validation logic.

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

| Option                                          | Category    | Notes                                                             |
| ----------------------------------------------- | ----------- | ----------------------------------------------------------------- |
| `basePath`                                      | Routing     | Build-time only                                                   |
| `trailingSlash`                                 | Routing     | Affects all routes                                                |
| `assetPrefix`                                   | Routing     | CDN prefix for static assets                                      |
| `headers()`                                     | Routing     | Custom response headers                                           |
| `redirects()`                                   | Routing     | 307/308 redirects                                                 |
| `rewrites()`                                    | Routing     | URL rewrites (no redirect)                                        |
| `output`                                        | Build       | `'standalone'` / `'export'`                                       |
| `distDir`                                       | Build       | Build output directory                                            |
| `compress`                                      | Build       | gzip for SSR (disable for proxy)                                  |
| `poweredByHeader`                               | Build       | Remove `X-Powered-By` header                                      |
| `images`                                        | Assets      | Full optimization config                                          |
| `cacheComponents`                               | Rendering   | Next.js 16 (replaces `dynamicIO`)                                 |
| `reactStrictMode`                               | Rendering   | Strict mode checks                                                |
| `reactCompiler`                                 | Rendering   | Auto-memoization; stable in Next.js 16                            |
| `typedRoutes`                                   | TypeScript  | Type-safe `<Link>` and `router.push()`; stable in v16             |
| `images.maximumRedirects`                       | Assets      | Max image redirects (default `3`, new in v16.1.6)                 |
| `experimental.authInterrupts`                   | Auth        | Enables `forbidden()`/`unauthorized()`                            |
| `experimental.staleTimes`                       | Cache       | Router cache TTL (dynamic/static)                                 |
| `experimental.viewTransition`                   | UX          | View Transitions API                                              |
| `experimental.browserDebugInfoInTerminal`       | DX          | Forward browser errors to terminal (Next.js 16.1)                 |
| `experimental.turbopackFileSystemCacheForDev`   | Build       | Turbopack disk cache for dev (default `true` in Next.js 16.1)     |
| `experimental.turbopackFileSystemCacheForBuild` | Build       | Turbopack disk cache for build (default `false`)                  |
| `experimental.optimizePackageImports`           | Build       | Auto tree-shake large packages via modularizeImports              |
| `experimental.webVitalsAttribution`             | Performance | Populate `metric.attribution` in `useReportWebVitals` callbacks   |
| `experimental.optimizeServerReact`              | Build       | Dead-code elimination of client React internals (default `true`)  |
| `experimental.inlineCss`                        | Performance | Inline CSS into HTML for faster FCP (App Router prod only)        |
| `experimental.serverComponentsHmrCache`         | DX          | Re-use fetch data across HMR reloads (default `true`)             |
| `experimental.globalNotFound`                   | Routing     | Single global `app/global-not-found.tsx` for all 404s             |
| `experimental.slowModuleDetection`              | DX          | Report modules above build-time threshold                         |
| `experimental.turbopackMinify`                  | Build       | Turbopack minification (default `true` in prod)                   |
| `experimental.turbopackScopeHoisting`           | Build       | Module scope hoisting for smaller bundles (default `true`)        |
| `experimental.transitionIndicator`              | UX          | Navigation progress bar during View Transitions (default `false`) |
| `experimental.typedEnv`                         | TypeScript  | Generate TS types for `.env` variables (default `false`)          |
| `experimental.turbopackInferModuleSideEffects`  | Build       | Turbopack side effect inference for tree-shaking                  |
| `experimental.isolatedDevBuild`                 | DX          | Run dev compilation in isolated worker (default `true`)           |
| `experimental.hideLogsAfterAbort`               | DX          | Suppress server logs when response is aborted (default `false`)   |
| `turbopack`                                     | Build       | Turbopack-specific configuration                                  |
| `logging`                                       | DX          | Dev server fetch + incoming request logging                       |
| `serverExternalPackages`                        | Runtime     | Exclude from server bundle                                        |
| `transpilePackages`                             | Runtime     | Force transpile node_modules                                      |
| `typescript.ignoreBuildErrors`                  | TypeScript  | Skip build-time type-check                                        |
| ~~`eslint`~~                                    | ESLint      | **Removed in Next.js 16** — use ESLint CLI directly               |

---

## See Also

- `references/next-config-options.md` — Exhaustive sub-option details, `has`/`missing` matcher syntax, Turbopack loader rules reference
- `nextjs-directives` skill — `'use cache'`, `'use client'`, `'use server'` directives
- `nextjs-components` skill — `<Image>`, `<Link>`, `<Script>` components
