# next.config Options — Exhaustive Reference

> Next.js 16 App Router only. All sub-options, types, and advanced usage patterns.

---

## `headers()` — Full Reference

### Basic Structure

```ts
async headers(): Promise<Header[]> {
  return [
    {
      source: '/api/:path*',
      headers: [
        { key: 'Cache-Control', value: 'no-store' },
        { key: 'X-Custom-Header', value: 'value' },
      ],
    },
  ]
}
```

### `Header` Object Shape

```ts
type Header = {
  source: string; // Path pattern
  headers: { key: string; value: string }[];
  has?: RouteHas[]; // All must match
  missing?: RouteHas[]; // All must be absent
  basePath?: false; // Opt-out of basePath prefix
  locale?: false; // Opt-out of locale prefix
};
```

### `RouteHas` Type (shared by headers, redirects, rewrites)

```ts
type RouteHas =
  | { type: "header"; key: string; value?: string }
  | { type: "cookie"; key: string; value?: string }
  | { type: "query"; key: string; value?: string }
  | { type: "host"; value: string };
```

### Conditional Headers with `has` / `missing`

```ts
async headers() {
  return [
    // Only apply if x-new-user header is present
    {
      source: '/',
      has: [{ type: 'header', key: 'x-new-user' }],
      headers: [{ key: 'Welcome', value: 'true' }],
    },
    // Only apply if cookie user is NOT set
    {
      source: '/:path*',
      missing: [{ type: 'cookie', key: 'user' }],
      headers: [{ key: 'X-Guest', value: 'true' }],
    },
    // Match header with specific value
    {
      source: '/api/:path*',
      has: [{ type: 'header', key: 'x-version', value: 'v2' }],
      headers: [{ key: 'X-Api-Version', value: '2' }],
    },
    // Match using named capture groups in value
    {
      source: '/:path*',
      has: [{ type: 'header', key: 'x-pathname', value: '(?<pathname>.*)' }],
      headers: [{ key: 'x-new-pathname', value: '/new/:pathname*' }],
    },
  ]
}
```

### Common Security Headers Pattern

```ts
const securityHeaders = [
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
]

async headers() {
  return [{ source: '/(.*)', headers: securityHeaders }]
}
```

---

## `redirects()` — Full Reference

### Redirect Object Shape

```ts
type Redirect = {
  source: string;
  destination: string;
  permanent: boolean; // true → 308, false → 307
  statusCode?: number; // Manual override (301, 302, 307, 308)
  has?: RouteHas[];
  missing?: RouteHas[];
  basePath?: false;
  locale?: false;
};
```

### Path Pattern Syntax

| Pattern       | Example Source       | Matches             |
| ------------- | -------------------- | ------------------- |
| Named segment | `/blog/:slug`        | `/blog/my-post`     |
| Wildcard      | `/old/:path*`        | `/old/a/b/c`        |
| Optional      | `/:path?`            | `/` and `/anything` |
| Regex         | `/blog/:id(\\d{1,})` | `/blog/123` only    |

```ts
async redirects() {
  return [
    // Permanent redirect (308)
    { source: '/about-us', destination: '/about', permanent: true },

    // Wildcard — preserve sub-path
    { source: '/docs/:path*', destination: '/documentation/:path*', permanent: false },

    // Regex constraint
    { source: '/api/v1/:path(.*)', destination: '/api/v2/:path', permanent: false },

    // Conditional — only if cookie absent
    {
      source: '/dashboard',
      missing: [{ type: 'cookie', key: 'session' }],
      destination: '/login',
      permanent: false,
    },

    // Query string matching
    {
      source: '/search',
      has: [{ type: 'query', key: 'q', value: '(?<query>.*)' }],
      destination: '/find?search=:query',
      permanent: false,
    },
  ]
}
```

---

## `rewrites()` — Full Reference

### Three-Phase Structure

```ts
async rewrites() {
  return {
    beforeFiles: [
      // Checked BEFORE filesystem + pages
      // Can override static files — be careful
      { source: '/docs/:path*', destination: '/docs-v2/:path*' },
    ],
    afterFiles: [
      // Checked AFTER filesystem, BEFORE dynamic fallback
      { source: '/api/:path*', destination: 'https://api.example.com/:path*' },
    ],
    fallback: [
      // Last resort — after pages + filesystem
      { source: '/:path*', destination: 'https://old-site.example.com/:path*' },
    ],
  }
}
```

### Flat Array (afterFiles equivalent)

```ts
async rewrites() {
  return [
    { source: '/proxy/:path*', destination: 'https://backend.example.com/:path*' },
  ]
}
```

### External Proxy Rewrite

```ts
{ source: '/api/:path*', destination: 'https://api.backend.com/:path*' }
// basePath is NOT automatically prepended for external destinations
// Internal destinations: basePath IS prepended unless basePath: false
```

### Named Capture Group Usage

```ts
{
  source: '/old/:category/:slug',
  destination: '/new/:category?slug=:slug',
}
```

### Conditional Rewrite with Host Matching

```ts
{
  source: '/:path*',
  has: [{ type: 'host', value: 'beta.example.com' }],
  destination: '/beta/:path*',
}
```

---

## `images` — Full Sub-Option Reference

### `remotePatterns`

```ts
type RemotePattern = {
  protocol?: "http" | "https"; // default: both
  hostname: string; // required; supports wildcards: '**.example.com'
  port?: string; // default: '' (any port)
  pathname?: string; // default: '**'; glob pattern
  search?: string; // exact query string match
};

// Examples
remotePatterns: [
  { hostname: "assets.example.com" },
  { protocol: "https", hostname: "**.cloudfront.net", pathname: "/images/**" },
  { hostname: "images.githubusercontent.com", search: "" }, // no query string
];
```

### `localPatterns`

```ts
type LocalPattern = {
  pathname?: string; // Glob pattern from public/ root
  search?: string; // Query string constraint
};

localPatterns: [
  { pathname: "/assets/images/**", search: "" },
  { pathname: "/content/**" },
];
// Only paths matching at least one pattern will be served
```

### `loader` and `loaderFile`

```ts
// Built-in loaders
loader: "default"; // Vercel/Next.js built-in
loader: "cloudinary"; // Cloudinary CDN
loader: "imgix"; // Imgix CDN
loader: "akamai"; // Akamai CDN
loader: "custom"; // Custom — requires loaderFile

// Custom loader file
loaderFile: "./lib/image-loader.ts";
// Must export a default function:
// (params: { src: string; width: number; quality?: number }) => string
```

```ts
// lib/image-loader.ts
export default function myLoader({
  src,
  width,
  quality,
}: {
  src: string;
  width: number;
  quality?: number;
}): string {
  return `https://cdn.example.com/${src}?w=${width}&q=${quality ?? 75}`;
}
```

### `formats`

```ts
formats: ["image/avif", "image/webp"];
// Order matters: first supported format by client is served
// 'image/avif' compresses better but slower to encode
// Default in Next.js 16: ['image/avif', 'image/webp']
// Older default: ['image/webp']
```

### `dangerouslyAllowSVG` + `contentSecurityPolicy`

```ts
dangerouslyAllowSVG: true,
contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
// SVGs can execute arbitrary JS — use restrictive CSP
```

### `qualities`

```ts
qualities: [25, 50, 75, 90, 100];
// Only these quality values are accepted via the quality prop on <Image>
// Helps with caching predictability
```

### `maximumRedirects` (new in v16.1.6)

```ts
maximumRedirects: 3; // default (changed from unlimited in Next.js 16.1.6)
maximumRedirects: 0; // disable image redirects entirely
maximumRedirects: 5; // increase for edge cases with multi-hop CDN redirects
// Controls max number of image URL redirects followed before returning an error
```

> **v16.1.6 breaking change**: The default changed from unlimited to `3`. If you rely on image URLs that redirect more than 3 times, explicitly set a higher value.

---

## `turbopack` — Full Reference

> Turbopack is the **default bundler for both `next dev` and `next build`** in Next.js 16. The `--turbopack` flag is no longer needed — it will be ignored. To opt out, pass `--no-turbopack`.

### `rules` — Custom Loaders

```ts
turbopack: {
  rules: {
    // SVG as React component
    '*.svg': {
      loaders: ['@svgr/webpack'],
      as: '*.js',
    },
    // MDX
    '*.mdx': {
      loaders: [
        {
          loader: '@mdx-js/loader',
          options: {
            remarkPlugins: [],
            rehypePlugins: [],
          },
        },
      ],
      as: '*.js',
    },
    // Raw file content as string
    '*.txt': {
      loaders: ['raw-loader'],
      as: '*.js',
    },
    // YAML
    '*.yaml': {
      loaders: ['yaml-loader'],
      as: '*.js',
    },
  },
}
```

Each rule value can be:

- `string[]` — array of loader package names
- `{ loaders: (string | { loader: string; options: object })[], as: string }` — with options and explicit output type

### `resolveAlias`

```ts
turbopack: {
  resolveAlias: {
    // Alias a module
    underscore: 'lodash',
    // Conditional alias (browser only)
    mocha: { browser: 'mocha/browser-entry.js' },
    // Alias to a local file
    '@utils': './src/utils/index.ts',
  },
}
```

### `resolveExtensions`

```ts
turbopack: {
  // OVERWRITES defaults — include all you need
  resolveExtensions: [
    '.ts', '.tsx', '.js', '.jsx', '.json', '.node', '.mdx',
  ],
}
```

### `moduleIdStrategy`

```ts
turbopack: {
  moduleIdStrategy: 'deterministic',  // Stable IDs based on content (default for prod)
  // or: 'named'                      // Human-readable IDs (useful for debugging)
}
```

### `treeShaking`

```ts
turbopack: {
  treeShaking: true,   // default
}
```

### `memoryLimit`

```ts
turbopack: {
  memoryLimit: 4096,   // MB — cap Turbopack memory usage
}
```

---

## `experimental.serverActions`

```ts
experimental: {
  serverActions: {
    bodySizeLimit: '2mb',     // default '1mb' — max request body for Server Actions
    allowedOrigins: [         // CSRF protection — origins allowed to invoke actions
      'my-proxy.com',
      '*.trusted.com',
    ],
  },
}
```

> Server Actions are stable in Next.js 14+. The `serverActions` config block only controls these two options.

---

## `output: 'export'` — Static Export Constraints

When using `output: 'export'`, the following are **not supported**:

- Dynamic routes that need `generateStaticParams` must export it
- API routes (Route Handlers) — use `next export` compatible alternatives
- Route Handlers that use dynamic data (cookies, headers)
  - `proxy.ts` — not supported in static export
- Image Optimization — set `unoptimized: true` or use `loader`

```ts
// next.config.ts for static export
const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true }, // required unless custom loader
  trailingSlash: true, // recommended for static hosts
};
```

---

## `output: 'standalone'` — Standalone Server

```ts
output: "standalone";
// Produces .next/standalone/ with:
// - server.js — Node.js server
// - node_modules/ — only required modules
// Copy public/ and .next/static/ manually in Dockerfile

// Dockerfile example:
// COPY --from=builder /app/.next/standalone ./
// COPY --from=builder /app/.next/static ./.next/static
// COPY --from=builder /app/public ./public
// CMD ["node", "server.js"]
```

---

## `serverExternalPackages` — When to Use

```ts
serverExternalPackages: [
  // Native bindings — cannot be bundled
  "bcrypt",
  "argon2",
  "@libsql/client",
  // Large packages that don't benefit from bundling
  "@prisma/client",
  // Packages with __dirname / __filename dependencies
  "some-legacy-pkg",
];
```

> All packages listed in `serverExternalPackages` are excluded from the Server Component bundle and loaded at runtime from `node_modules`.

---

## `transpilePackages` — When to Use

```ts
transpilePackages: [
  // Monorepo packages (ESM or TypeScript)
  "@acme/ui",
  "@internal/utils",
  // Third-party ESM-only packages lacking CJS build
  "some-esm-only-lib",
  // Packages using React JSX transform
  "react-tweet",
];
```

---

## `logging` — Full Reference

Controls what the Next.js development server logs to the terminal.

```ts
type IncomingRequestLoggingConfig = {
  ignore?: RegExp[]; // suppress requests matching any of these patterns
};

type LoggingConfig = {
  fetches?: {
    fullUrl?: boolean; // show full URL (including domain) in fetch logs
    hmrRefreshes?: boolean; // log HMR-cache-restored fetches during dev
  };
  incomingRequests?: boolean | IncomingRequestLoggingConfig;
};
```

### `logging.fetches`

```ts
logging: {
  fetches: {
    fullUrl: true,       // default: false — show full URL in server fetch logs
    hmrRefreshes: true,  // default: false — log cache-restored fetches during HMR
  },
}
```

> With `cacheComponents: true` + `fullUrl: true` you can trace exactly which external URLs are being fetched vs. served from cache during hot reload.

### `logging.incomingRequests`

```ts
// Enable (default):
logging: { incomingRequests: true }

// Disable entirely:
logging: { incomingRequests: false }

// Suppress specific patterns (health checks, static assets):
logging: {
  incomingRequests: {
    ignore: [/^\/_next\/static/, /^\/api\/health/],
  },
}
```

### Disable all logging

```ts
logging: false;
```

---

## `experimental.browserDebugInfoInTerminal` (Next.js 16.1)

```ts
// Boolean — enable with defaults (depthLimit: 5, edgeLimit: 100):
experimental: {
  browserDebugInfoInTerminal: true,
}

// Object — override defaults:
experimental: {
  browserDebugInfoInTerminal: {
    showSourceLocation: true,  // include source file path + line number (default: undefined)
    depthLimit: 5,             // max object nesting depth for circular refs (default: 5)
    edgeLimit: 100,            // max properties per object for circular refs (default: 100)
  },
}
```

**Type:**

```ts
type BrowserDebugInfoInTerminal =
  | boolean
  | {
      depthLimit?: number; // default: 5
      edgeLimit?: number; // default: 100
      showSourceLocation?: boolean;
    };
```

> Forwards browser-side runtime errors, console warnings, and async errors to the Next.js terminal output. Makes client-side errors visible to AI agents, headless CI runners, and CLI workflows that cannot open browser DevTools. Default: `false`.

---

## `experimental.turbopackFileSystemCacheForDev` / `turbopackFileSystemCacheForBuild` (Next.js 16.1)

```ts
experimental: {
  turbopackFileSystemCacheForDev: true,   // on by default in Next.js 16.1
  turbopackFileSystemCacheForBuild: false, // opt-in; off by default
}
```

| Option                             | Default | Description                                                      |
| ---------------------------------- | ------- | ---------------------------------------------------------------- |
| `turbopackFileSystemCacheForDev`   | `true`  | Persist Turbopack compiler artifacts between `next dev` restarts |
| `turbopackFileSystemCacheForBuild` | `false` | Persist Turbopack artifacts between `next build` runs            |

> `turbopackFileSystemCacheForDev: true` is the default in Next.js 16.1 — no configuration needed for the dev cache. Set to `false` to disable (useful if stale cache causes issues). `turbopackFileSystemCacheForBuild` is experimental; enables incremental production builds.

---

## `experimental.optimizePackageImports`

```ts
experimental: {
  optimizePackageImports: [
    'lucide-react',
    '@radix-ui/react-icons',
    'date-fns',
    '@heroicons/react',
    'lodash',
  ],
}
```

> Automatically applies the `modularizeImports` optimization: transforms `import { X } from 'pkg'` into a direct sub-path import (`import X from 'pkg/X'`). Eliminates the cost of importing and tree-shaking large packages with many named exports. Use for any icon library, date utility, or component kit that ships many symbols.

---

## `reactCompiler` (stable in Next.js 16)

> **Promoted from `experimental.reactCompiler` to top-level stable in Next.js 16.**

```ts
// Enable for all components
reactCompiler: true;

// Opt-in annotation mode — only applies to functions/components with 'use memo'
reactCompiler: {
  compilationMode: "annotation";
}
```

**Type:**

```ts
type ReactCompilerConfig =
  | boolean
  | { compilationMode?: "all" | "annotation" | "infer" };
```

- Default: `false`
- Requires `babel-plugin-react-compiler` dev dependency: `pnpm add -D babel-plugin-react-compiler`
- When enabled, **do not manually add** `useMemo`, `useCallback`, or `React.memo` — the compiler handles it
- Expect higher compile times in dev and build (Babel-based transform)
- Use `annotation` mode for gradual rollout; opt in per component with `'use memo'`

---

## `typedRoutes` (stable in Next.js 16)

> **Promoted from `experimental.typedRoutes` to top-level stable in Next.js 16.**

```ts
typedRoutes: true;
```

- Default: `false`
- Requires TypeScript
- Generates `.next/types/__route-manifest.d.ts` at build time
- Type-checks all `<Link href="...">` and `router.push('...')` calls at compile time
- For non-literal strings, cast with `as Route` from `'next'`:

```ts
import type { Route } from "next";

router.push(("/blog/" + slug) as Route);
```

---

## Full TypeScript Config Type

```ts
import type { NextConfig } from "next";

// All options (most are optional)
const config: NextConfig = {
  // Routing
  basePath: "",
  trailingSlash: false,
  assetPrefix: "",
  skipTrailingSlashRedirect: false,
  skipProxyUrlNormalize: false,

  // HTTP routing (async functions)
  async headers() {
    return [];
  },
  async redirects() {
    return [];
  },
  async rewrites() {
    return [];
  },

  // Build
  distDir: ".next",
  output: undefined,
  cleanDistDir: true,
  generateBuildId: async () => null,
  compress: true,
  poweredByHeader: true,
  pageExtensions: ["tsx", "ts", "jsx", "js"],

  // Images
  images: {
    remotePatterns: [],
    localPatterns: [],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [32, 48, 64, 96, 128, 256, 384], // 16px removed in Next.js 16.1.6
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 14400,
    dangerouslyAllowSVG: false,
    contentSecurityPolicy: undefined,
    contentDispositionType: "inline",
    unoptimized: false,
    loader: "default",
    loaderFile: "",
    qualities: undefined,
    maximumRedirects: 3, // new in v16.1.6; default changed from unlimited to 3
  },

  // Rendering
  reactStrictMode: true, // default for App Router (enabled by default since v13.5.1; set false to disable)
  reactCompiler: false, // stable in Next.js 16 — auto-memoization; requires babel-plugin-react-compiler
  typedRoutes: false, // stable in Next.js 16 — type-safe <Link href> and router.push()

  // Caching (Next.js 16)
  cacheComponents: false,
  cacheLife: {
    // Named profiles for use with cacheLife() inside 'use cache' scopes
    // example: { editorial: { stale: 600, revalidate: 3600, expire: 86400 } }
  },

  // Runtime
  serverExternalPackages: [],
  transpilePackages: [],
  bundlePagesRouterDependencies: false,

  // TypeScript
  typescript: {
    ignoreBuildErrors: false,
    tsconfigPath: "./tsconfig.json",
  },

  // ESLint — REMOVED in Next.js 16
  // Use ESLint CLI directly with eslint.config.mjs

  // Turbopack
  turbopack: {
    rules: {},
    resolveAlias: {},
    resolveExtensions: [],
  },

  // Experimental
  experimental: {
    authInterrupts: false,
    staleTimes: { dynamic: 0, static: 300 },
    viewTransition: false,
    serverActions: {
      bodySizeLimit: "1mb",
      allowedOrigins: [],
    },
    // Next.js 16.1 additions:
    browserDebugInfoInTerminal: false, // true | { showSourceLocation?, depthLimit?, edgeLimit? }
    turbopackFileSystemCacheForDev: true, // on by default
    turbopackFileSystemCacheForBuild: false,
    optimizePackageImports: [],
  },

  // Logging (development server)
  logging: {
    fetches: {
      fullUrl: false,
      hmrRefreshes: false,
    },
    incomingRequests: true, // false | { ignore?: RegExp[] }
  },
  // logging: false,  // disable all server logging
};
```
