---
name: nextjs-server-runtime
description: >
  Next.js 16 server runtime types and APIs reference. Use this skill when working
  with NextRequest, NextResponse, userAgent, or next/font runtime APIs. Covers all
  properties and methods of NextRequest (cookies, geo, ip, nextUrl) and NextResponse
  (json, redirect, rewrite, next, cookies), the userAgent helper, and the NextFont
  return type from next/font. Trigger on any question about request/response handling
  in proxy.ts or Route Handlers, user-agent detection, or font runtime
  properties in Next.js 16.
---

# Next.js 16 — Server Runtime APIs

> **Scope**: App Router only. `NextRequest` / `NextResponse` are available in `proxy.ts` (formerly `middleware.ts`), Route Handlers, and Edge functions.

---

## `NextRequest`

Extends the Web `Request` API with Next.js-specific properties.

```ts
import type { NextRequest } from "next/server";
```

### Constructor

`NextRequest` is passed automatically to `proxy.ts` and route handlers; you don't instantiate it directly. For testing:

```ts
import { NextRequest } from "next/server";
const req = new NextRequest("https://example.com/api/users", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ name: "Alice" }),
});
```

The `init` parameter extends the standard `RequestInit` with Next.js-specific fields:

```ts
// NextRequest's extended RequestInit (from next/dist/server/web/spec-extension/request.d.ts)
interface RequestInit extends globalThis.RequestInit {
  nextConfig?: {
    basePath?: string; // Next.js basePath config
    i18n?: I18NConfig | null; // i18n config
    trailingSlash?: boolean; // trailingSlash config
  };
  signal?: AbortSignal;
  duplex?: "half"; // enables streaming request body
}
```

> `duplex: 'half'` is required when streaming a request body via `ReadableStream` — some environments require it for half-duplex HTTP/1.1 or HTTP/2 streams.

### Inherited from Web `Request`

| Property/Method | Type                         | Description                    |
| --------------- | ---------------------------- | ------------------------------ |
| `url`           | `string`                     | Full request URL               |
| `method`        | `string`                     | HTTP method                    |
| `headers`       | `Headers`                    | Request headers                |
| `body`          | `ReadableStream \| null`     | Request body                   |
| `bodyUsed`      | `boolean`                    | Whether body has been consumed |
| `json()`        | `() => Promise<unknown>`     | Parse body as JSON             |
| `text()`        | `() => Promise<string>`      | Parse body as text             |
| `formData()`    | `() => Promise<FormData>`    | Parse body as form data        |
| `arrayBuffer()` | `() => Promise<ArrayBuffer>` | Parse body as ArrayBuffer      |
| `clone()`       | `() => Request`              | Clone request                  |

### Next.js Extensions

| Property  | Type             | Description                                  |
| --------- | ---------------- | -------------------------------------------- |
| `nextUrl` | `NextURL`        | Mutable URL object with Next.js routing info |
| `cookies` | `RequestCookies` | Parsed cookies from `Cookie` header          |

> ⚠️ **`geo` and `ip` were removed from `NextRequest` in Next.js 15.** Use `@vercel/functions` instead (`pnpm add @vercel/functions`):
>
> ```ts
> import { geolocation, ipAddress } from "@vercel/functions";
> const { city, country, region } = geolocation(request);
> const ip = ipAddress(request);
> ```

### `NextURL`

Extends the Web `URL` API with Next.js routing properties.

| Property        | Type                        | Description                                        |
| --------------- | --------------------------- | -------------------------------------------------- |
| `pathname`      | `string`                    | URL path (mutable)                                 |
| `searchParams`  | `URLSearchParams`           | Query params (mutable)                             |
| `search`        | `string`                    | Query string including `?`                         |
| `href`          | `string`                    | Full URL string                                    |
| `origin`        | `string`                    | Protocol + hostname + port                         |
| `host`          | `string`                    | Hostname + port                                    |
| `hostname`      | `string`                    | Hostname only                                      |
| `port`          | `string`                    | Port                                               |
| `protocol`      | `string`                    | Protocol (e.g., `https:`)                          |
| `hash`          | `string`                    | Fragment                                           |
| `basePath`      | `string`                    | Next.js `basePath` config value                    |
| `locale`        | `string`                    | Detected locale (Pages Router i18n only)           |
| `defaultLocale` | `string \| undefined`       | Default locale configured (Pages Router i18n only) |
| `domainLocale`  | `DomainLocale \| undefined` | Domain-based locale (Pages Router i18n only)       |

### `RequestCookies` — `request.cookies`

| Method     | Signature                                                        | Description                                |
| ---------- | ---------------------------------------------------------------- | ------------------------------------------ |
| `get`      | `(name: string) => { name: string; value: string } \| undefined` | Get a single cookie                        |
| `getAll`   | `(name?: string) => { name: string; value: string }[]`           | Get all cookies                            |
| `has`      | `(name: string) => boolean`                                      | Check if cookie exists                     |
| `set`      | `(name: string, value: string) => void`                          | Set a cookie (modifies request internally) |
| `delete`   | `(name: string \| string[]) => boolean \| boolean[]`             | Delete a cookie                            |
| `clear`    | `() => void`                                                     | Remove all cookies                         |
| `toString` | `() => string`                                                   | Serialize to `Cookie` header string        |

### Full Proxy Example

> **Next.js 16**: The file is `proxy.ts` (renamed from `middleware.ts`). Export the `proxy` function. Runtime is Node.js.

```ts
// proxy.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { geolocation } from "@vercel/functions"; // pnpm add @vercel/functions

export function proxy(request: NextRequest) {
  // Read URL
  const { pathname } = request.nextUrl;

  // Read cookies
  const sessionToken = request.cookies.get("session-token")?.value;

  // Read headers
  const authHeader = request.headers.get("authorization");

  // Geolocation (Vercel only — geo/ip removed from NextRequest in Next.js 15)
  const { country = "US" } = geolocation(request);

  // Redirect unauthenticated users
  if (!sessionToken && pathname.startsWith("/dashboard")) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Rewrite based on country
  if (pathname === "/") {
    return NextResponse.rewrite(
      new URL(`/${country.toLowerCase()}`, request.url),
    );
  }

  // Pass through with added header
  const response = NextResponse.next();
  response.headers.set("x-country", country);
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
```

---

## `NextResponse`

Extends the Web `Response` API with Next.js factory methods.

```ts
import { NextResponse } from "next/server";
```

### Constructor

```ts
new NextResponse(body?: BodyInit | null, init?: ResponseInit)
```

### Static Factory Methods

| Method                  | Signature                                                             | Returns      | Description                                      |
| ----------------------- | --------------------------------------------------------------------- | ------------ | ------------------------------------------------ |
| `NextResponse.next`     | `(init?: ResponseInit & { request?: RequestInit }) => NextResponse`   | NextResponse | Pass through to next middleware/handler          |
| `NextResponse.redirect` | `(url: string \| URL, init?: number \| ResponseInit) => NextResponse` | NextResponse | Redirect to URL                                  |
| `NextResponse.rewrite`  | `(destination: string \| URL, init?: ResponseInit) => NextResponse`   | NextResponse | Serve different URL without changing address bar |
| `NextResponse.json`     | `<T>(body: T, init?: ResponseInit) => NextResponse`                   | NextResponse | JSON response                                    |

### Instance Properties

| Property     | Type              | Description                         |
| ------------ | ----------------- | ----------------------------------- |
| `cookies`    | `ResponseCookies` | Manage `Set-Cookie` headers         |
| `headers`    | `Headers`         | Response headers                    |
| `status`     | `number`          | HTTP status code                    |
| `ok`         | `boolean`         | `true` if status is 200–299         |
| `redirected` | `boolean`         | Whether this is a redirect response |
| `url`        | `string`          | Final URL after redirect            |

### `ResponseCookies` — `response.cookies`

| Method   | Signature                                                                   | Description                        |
| -------- | --------------------------------------------------------------------------- | ---------------------------------- |
| `set`    | `(name: string, value: string, options?: CookieOptions) => ResponseCookies` | Set a `Set-Cookie` header          |
| `get`    | `(name: string) => { name: string; value: string } \| undefined`            | Read a set cookie                  |
| `getAll` | `() => { name: string; value: string }[]`                                   | Read all set cookies               |
| `delete` | `(name: string \| { name: string; ... }) => ResponseCookies`                | Delete a cookie (sets `Max-Age=0`) |

### Examples

```ts
// Route Handler: JSON response
export async function GET() {
  return NextResponse.json({ status: "ok" });
}

// Route Handler: Custom status
export async function POST(request: NextRequest) {
  const data = await request.json();
  return NextResponse.json({ created: data }, { status: 201 });
}

// Set cookie in Route Handler
export async function GET(request: NextRequest) {
  const response = NextResponse.json({ ok: true });
  response.cookies.set("session", "abc123", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
  return response;
}

// Proxy: redirect
function proxy(request: NextRequest) {
  return NextResponse.redirect(new URL("/home", request.url));
}

// Proxy: rewrite
function proxy(request: NextRequest) {
  return NextResponse.rewrite(new URL("/internal-path", request.url));
}

// Proxy: add response headers
function proxy(request: NextRequest) {
  const response = NextResponse.next();
  response.headers.set("x-custom-header", "my-value");
  response.headers.set("Access-Control-Allow-Origin", "https://example.com");
  return response;
}
```

---

## `userAgent(request)`

Parses the `User-Agent` request header into structured data.

```ts
import { userAgent } from "next/server";
```

### Signature

```ts
function userAgent(request: Request | { headers: Headers }): UserAgent;
```

### `UserAgent` Return Object

| Property           | Type                                                                                      | Description                                    |
| ------------------ | ----------------------------------------------------------------------------------------- | ---------------------------------------------- |
| `isBot`            | `boolean`                                                                                 | Whether the client is a known bot/crawler      |
| `browser.name`     | `string \| undefined`                                                                     | Browser name (e.g., `'Chrome'`, `'Safari'`)    |
| `browser.version`  | `string \| undefined`                                                                     | Browser version                                |
| `device.model`     | `string \| undefined`                                                                     | Device model                                   |
| `device.type`      | `'mobile' \| 'tablet' \| 'console' \| 'smarttv' \| 'wearable' \| 'embedded' \| undefined` | Device type (`undefined` = desktop)            |
| `device.vendor`    | `string \| undefined`                                                                     | Device vendor (e.g., `'Apple'`)                |
| `engine.name`      | `string \| undefined`                                                                     | Rendering engine (e.g., `'Blink'`, `'WebKit'`) |
| `engine.version`   | `string \| undefined`                                                                     | Engine version                                 |
| `os.name`          | `string \| undefined`                                                                     | OS name (e.g., `'iOS'`, `'Windows'`)           |
| `os.version`       | `string \| undefined`                                                                     | OS version                                     |
| `cpu.architecture` | `string \| undefined`                                                                     | CPU architecture (e.g., `'amd64'`)             |

### Examples

```ts
// proxy.ts — serve mobile vs desktop layout
import { NextResponse, userAgent } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const { device, isBot } = userAgent(request);

  if (isBot) {
    return NextResponse.redirect(new URL("/bot-landing", request.url));
  }

  if (device.type === "mobile") {
    return NextResponse.rewrite(
      new URL("/mobile" + request.nextUrl.pathname, request.url),
    );
  }

  return NextResponse.next();
}

// Route Handler — conditional response
export async function GET(request: NextRequest) {
  const { browser, os } = userAgent(request);
  return NextResponse.json({
    browser: browser.name,
    os: os.name,
    compatible: browser.name !== "IE",
  });
}
```

---

## `NextFont` — `next/font` Runtime API

The return type of `next/font/google` and `next/font/local` calls.

```ts
import { Inter } from "next/font/google";
const inter = Inter({ subsets: ["latin"] });
// inter: NextFont
```

### `NextFont` Properties

| Property    | Type                                                              | Description                                                  |
| ----------- | ----------------------------------------------------------------- | ------------------------------------------------------------ |
| `className` | `string`                                                          | CSS class that applies the font family                       |
| `style`     | `{ fontFamily: string; fontWeight?: number; fontStyle?: string }` | Inline style object                                          |
| `variable`  | `string \| undefined`                                             | CSS custom property name (only if `variable` option was set) |

```tsx
// Using className
<html className={inter.className}>

// Using style object (e.g., inside styled components or when className conflicts)
<p style={inter.style}>Hello</p>

// Using CSS variable (combine with Tailwind or CSS-in-JS)
// Font definition with variable
const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

// Apply to HTML element
<html className={inter.variable}>
```

In Tailwind CSS (v4), after setting the variable:

```css
/* app/globals.css */
@theme {
  --font-sans: var(--font-inter), ui-sans-serif, system-ui, sans-serif;
}
```

```tsx
<p className="font-sans">Hello</p>
```

---

## `userAgentFromString()` — Parse UA String Directly

Like `userAgent()` but accepts a raw UA string instead of a `Request` object. Useful when the user-agent comes from a header value already extracted.

```ts
import { userAgentFromString } from "next/server";
```

### Signature

```ts
function userAgentFromString(input: string | undefined): UserAgent;
```

Returns the same `UserAgent` shape as `userAgent()` above.

```ts
import { userAgentFromString } from "next/server";

// Parse a raw UA string (e.g., from a log or cached header value)
const ua = userAgentFromString(
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
);
console.log(ua.device.type); // 'mobile'
console.log(ua.os.name); // 'iOS'
```

---

## `URLPattern` — URL Pattern Matching

Web-standard `URLPattern` API re-exported from `next/server` for use in proxy functions and Route Handlers without a separate import.

```ts
import { URLPattern } from "next/server";
```

### Signature

```ts
class URLPattern {
  constructor(input: URLPatternInput, baseURL?: string);
  test(input: URLPatternInput | string, baseURL?: string): boolean;
  exec(
    input: URLPatternInput | string,
    baseURL?: string,
  ): URLPatternResult | null;
  readonly protocol: string;
  readonly username: string;
  readonly password: string;
  readonly hostname: string;
  readonly port: string;
  readonly pathname: string;
  readonly search: string;
  readonly hash: string;
}
```

```ts
import { URLPattern } from "next/server";

const pattern = new URLPattern({ pathname: "/blog/:slug" });

pattern.test("https://example.com/blog/hello"); // true
const result = pattern.exec("https://example.com/blog/hello");
result?.pathname.groups; // { slug: 'hello' }
```

---

## Type Exports — `ProxyConfig` / `NextProxy`

Types for typing the `proxy.ts` function and its `config` export.

```ts
import type { NextProxy, ProxyConfig, NextFetchEvent } from "next/server";
```

### `NextFetchEvent`

The second parameter of the `NextProxy` function (passed by Next.js runtime). Extends the standard `FetchEvent` interface.

```ts
import { NextFetchEvent } from "next/server";
```

| Member                     | Type                        | Description                                        |
| -------------------------- | --------------------------- | -------------------------------------------------- |
| `sourcePage`               | `string`                    | The page path that triggered this proxy invocation |
| `waitUntil(promise)`       | `(p: Promise<any>) => void` | Keeps the runtime alive until `promise` resolves   |
| `passThroughOnException()` | `() => void`                | Continue to the next handler if an error is thrown |

```ts
// proxy.ts — fire-and-forget analytics call
export default function proxy(request: NextRequest, event: NextFetchEvent) {
  event.waitUntil(
    logRequest(request.url, request.headers), // background, doesn't block response
  );
  return NextResponse.next();
}
```

> Inside Route Handlers and Server Components, use `after()` from `next/server` for post-response tasks instead of `event.waitUntil()`.

### `NextProxy`

The function signature for the default export from `proxy.ts`.

```ts
// Definition (simplified)
type NextProxy = (
  request: NextRequest,
  event: NextFetchEvent,
) =>
  | NextResponse
  | Response
  | null
  | undefined
  | void
  | Promise<NextResponse | Response | null | undefined | void>;
```

```ts
// proxy.ts — typed export
import type { NextProxy } from "next/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const proxy: NextProxy = (request: NextRequest) => {
  if (request.nextUrl.pathname.startsWith("/admin")) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }
};

export default proxy;
```

### `ProxyConfig`

The config shape for the `config` export in `proxy.ts`. Controls which routes the proxy runs on, deployment regions, and dynamic code evaluation.

```ts
import type { ProxyConfig } from "next/server";

// RouteHas union type (for has/missing conditions):
type RouteHas =
  | { type: "header" | "cookie" | "query"; key: string; value?: string }
  | { type: "host"; key?: undefined; value: string };

// ProxyConfig full type:
type ProxyConfig = {
  matcher?:
    | string
    | Array<
        | string
        | {
            source: string;
            locale?: false; // disable locale prefix matching
            has?: RouteHas[]; // only run if request HAS these headers/cookies/query
            missing?: RouteHas[]; // only run if request is MISSING these
          }
      >;
  regions?: string | string[]; // deployment regions to run on (Vercel)
  unstable_allowDynamic?: string | string[]; // globs for allowed dynamic eval
};
```

```ts
// proxy.ts — common patterns
export const config: ProxyConfig = {
  // Simple string matcher
  matcher: ["/admin/:path*", "/dashboard/:path*"],

  // Advanced: conditional matching on header presence
  matcher: [
    {
      source: "/api/:path*",
      has: [{ type: "header", key: "x-api-key" }],
    },
  ],
};
```

> **Deprecated aliases**: `NextMiddleware` (use `NextProxy`) and `MiddlewareConfig` (use `ProxyConfig`) are still exported for backwards compatibility.
