---
name: nextjs-metadata-functions
description: >
  Next.js 16 App Router metadata functions reference. Use this skill when working
  with generateMetadata, generateViewport, generateStaticParams, generateImageMetadata,
  generateSitemaps, or ImageResponse. Covers all Metadata object fields (title,
  description, openGraph, twitter, icons, robots, alternates, viewport, themeColor,
  formatDetection), viewport configuration, static generation, and dynamic OG images.
  Trigger on any question about SEO, Open Graph, Twitter cards, page metadata,
  static site generation, sitemaps, or OG image generation in Next.js 16.
---

# Next.js 16 — Metadata Functions

> **Scope**: App Router only. Functions export from `page.tsx` and `layout.tsx`.

---

## Static `metadata` Export

A `Metadata` object exported as a named constant. Merged with parent layouts.

```ts
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Page",
  description: "My page description",
};
```

---

## `generateMetadata({ params, searchParams }, parent)` → `Promise<Metadata>`

Async function for dynamic metadata (fetched from DB, API, etc.).

### Signature

```ts
import type { Metadata, ResolvingMetadata } from "next";

export async function generateMetadata(
  props: {
    params: Promise<Record<string, string | string[]>>;
    searchParams: Promise<Record<string, string | string[] | undefined>>;
  },
  parent: ResolvingMetadata, // resolved parent metadata
): Promise<Metadata>;
```

### `Metadata` — All Fields

```ts
const metadata: Metadata = {
  // ── Title ──────────────────────────────────────────
  title: "My App",
  // or template object:
  title: {
    default: "My App", // fallback for child routes without title
    template: "%s | My App", // %s is replaced by child title
    absolute: "Exact Title", // ignores template from parents
  },

  // ── Basic ───────────────────────────────────────────
  description: "Page description for SEO",
  applicationName: "My App",
  authors: [{ name: "Alice", url: "https://alice.dev" }],
  generator: "Next.js",
  keywords: ["Next.js", "React", "TypeScript"],
  referrer: "origin-when-cross-origin", // ReferrerPolicy string
  creator: "Alice",
  publisher: "Acme Corp",
  category: "technology",
  classification: "General",

  // ── Robots ──────────────────────────────────────────
  robots: {
    index: true,
    follow: true,
    // All RobotsInfo fields (apply to both top-level robots and googleBot):
    noarchive: false, // prevent caching of this page
    nosnippet: false, // omit text snippet + video preview in results
    noimageindex: false, // don't index images on this page
    notranslate: false, // don't offer page translation
    nocache: false, // alias for noarchive (Google-specific)
    indexifembedded: false, // index even if embedded in an iframe
    nositelinkssearchbox: false, // don't show sitelinks search box
    unavailable_after: "2025-12-31", // stop indexing after ISO 8601 date/time
    "max-video-preview": -1, // -1 = no limit; 0 = no preview; N = max seconds
    "max-image-preview": "large", // 'none' | 'standard' | 'large'
    "max-snippet": -1, // -1 = no limit; 0 = no snippet; N = max chars
    googleBot: {
      index: true,
      follow: false,
      noimageindex: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },

  // ── Alternates (canonical, hreflang) ─────────────────
  alternates: {
    canonical: "https://example.com/blog/post",
    languages: {
      "en-US": "https://example.com/en/blog/post",
      "es-ES": "https://example.com/es/blog/post",
    },
    media: {
      "only screen and (max-width: 600px)": "https://m.example.com",
    },
    types: {
      "application/rss+xml": "https://example.com/rss",
    },
  },

  // ── Open Graph ──────────────────────────────────────
  openGraph: {
    title: "My App",
    description: "The React Framework for the Web",
    url: "https://example.com",
    siteName: "My App",
    locale: "en_US",
    type: "website", // 'article' | 'book' | 'profile' | 'website' | 'music.*' | 'video.*'
    images: [
      {
        url: "https://example.com/og.png", // must be absolute URL
        width: 1200,
        height: 630,
        alt: "My App open graph image",
        type: "image/png",
        secureUrl: "https://example.com/og.png",
      },
    ],
    videos: [{ url: "https://example.com/demo.mp4", width: 1280, height: 720 }],
    audio: [{ url: "https://example.com/audio.mp3" }],
    // Article-specific (type: 'article')
    publishedTime: "2024-01-01T00:00:00.000Z",
    modifiedTime: "2024-06-01T00:00:00.000Z",
    expirationTime: "2025-01-01T00:00:00.000Z",
    authors: ["https://example.com/author"],
    section: "Technology",
    tags: ["Next.js", "React"],
    countryName: "United States",
  },

  // ── Twitter / X ─────────────────────────────────────
  twitter: {
    card: "summary_large_image", // 'summary' | 'summary_large_image' | 'app' | 'player'
    title: "My App",
    description: "The React Framework",
    siteId: "1467726470533754880",
    creator: "@alice",
    creatorId: "1467726470533754880",
    images: ["https://example.com/og.png"], // absolute URLs
    // app card
    app: {
      name: { iphone: "MyApp", ipad: "MyApp", googleplay: "My App" },
      id: { iphone: "123", ipad: "456", googleplay: "com.example.app" },
      url: { iphone: "https://myapp.com", ipad: "https://myapp.com" },
    },
    // player card
    players: [
      {
        playerUrl: "https://example.com/video",
        streamUrl: "https://stream",
        width: 640,
        height: 360,
      },
    ],
  },

  // ── Icons ───────────────────────────────────────────
  icons: {
    icon: "/favicon.ico",
    // or array of IconDescriptor objects:
    icon: [
      {
        url: "/icon.png",
        type: "image/png", // MIME type
        sizes: "32x32", // size string
        color: "#000000", // mask-icon colour (SVG only)
        media: "(prefers-color-scheme: dark)", // media query for conditional serving
        rel: "icon", // overrides default rel
        fetchPriority: "high", // 'high' | 'low' | 'auto'
      },
      { url: "/icon-192.png", sizes: "192x192" },
    ],
    shortcut: "/shortcut-icon.png",
    apple: "/apple-icon.png",
    // or array:
    apple: [
      { url: "/apple-icon-180.png", sizes: "180x180", type: "image/png" },
    ],
    other: [
      { rel: "apple-touch-icon-precomposed", url: "/apple-touch-icon.png" },
    ],
  },

  // ── App Links ────────────────────────────────────────
  appLinks: {
    ios: { url: "app://example.com", app_store_id: "123" },
    android: { package: "com.example.app", app_name: "My App" },
    web: { url: "https://example.com", should_fallback: true },
  },

  // ── Manifest ─────────────────────────────────────────
  manifest: "/manifest.webmanifest",

  // ── Archives / Assets ────────────────────────────────
  archives: ["https://example.com/archive-2023"],
  assets: ["https://example.com/assets/"],
  bookmarks: ["https://example.com/bookmarks"],

  // ── Verification ─────────────────────────────────────
  verification: {
    google: "google-verification-token",
    yahoo: "yahoo-verification-token",
    yandex: "yandex-verification-token",
    me: ["mailto:alice@example.com", "https://alice.dev"],
    other: {
      me: ["https://alice.dev"],
    },
  },

  // ── Apple Web App ────────────────────────────────────
  appleWebApp: {
    capable: true,
    title: "My App",
    statusBarStyle: "black-translucent", // 'default' | 'black' | 'black-translucent'
    startupImage: [
      { url: "/splash.png" },
      {
        url: "/splash-640x1136.png",
        media: "(device-width: 320px) and (device-height: 568px)",
      },
    ],
  },

  // ── Format Detection ─────────────────────────────────
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },

  // ── iTunes ───────────────────────────────────────────
  itunes: {
    appId: "123456789",
    appArgument: "https://myapp.com/product/1",
  },

  // ── Facebook ─────────────────────────────────────────
  // Mutually exclusive: provide either appId OR admins, not both
  facebook: { appId: "12345678" },
  // or: facebook: { admins: ["12345678", "87654321"] },
  // Renders: <meta property="fb:app_id" content="12345678" />
  //          <meta property="fb:admins" content="12345678" />

  // ── Pinterest ────────────────────────────────────────
  pinterest: { richPin: true },
  // Renders: <meta name="pinterest-rich-pin" content="true" />

  // ── Abstract ─────────────────────────────────────────
  // Deprecated HTML meta tag; superseded by `description`. Rarely used.
  abstract: "My Website Description",
  // Renders: <meta name="abstract" content="My Website Description" />

  // ── Pagination ───────────────────────────────────────
  // Generates <link rel="prev"> and <link rel="next"> for paginated content
  pagination: {
    previous: "https://example.com/items?page=1",
    next: "https://example.com/items?page=3",
  },
  // Renders:
  // <link rel="prev" href="https://example.com/items?page=1" />
  // <link rel="next" href="https://example.com/items?page=3" />

  // ── Other ────────────────────────────────────────────
  other: {
    "custom-meta": "value",
  },
};
```

---

## `generateViewport({ params })` → `Viewport`

Controls viewport meta tag and theme color. Separate from `Metadata` since Next.js 14.

### Signature

```ts
import type { Viewport } from "next";

export function generateViewport(props: {
  params: Promise<Record<string, string>>;
}): Viewport;
```

### `Viewport` Fields

| Field               | Type                                                                            | Description                                                         |
| ------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `width`             | `string \| number`                                                              | Usually `"device-width"`                                            |
| `height`            | `string \| number`                                                              | Rarely needed; omit in most cases                                   |
| `initialScale`      | `number`                                                                        | Initial zoom level (`1` = 100%)                                     |
| `minimumScale`      | `number`                                                                        | Minimum allowed zoom level                                          |
| `maximumScale`      | `number`                                                                        | Maximum allowed zoom level                                          |
| `userScalable`      | `boolean`                                                                       | Whether user can pinch-zoom                                         |
| `viewportFit`       | `'auto' \| 'contain' \| 'cover'`                                                | Safe-area behavior on notched devices                               |
| `interactiveWidget` | `'resizes-visual' \| 'resizes-content' \| 'overlays-content'`                   | How virtual keyboard affects layout                                 |
| `themeColor`        | `string \| ThemeColorDescriptor \| ThemeColorDescriptor[]`                      | Browser chrome color; use array for `prefers-color-scheme` variants |
| `colorScheme`       | `'normal' \| 'light' \| 'dark' \| 'light dark' \| 'dark light' \| 'only light'` | Preferred color scheme hint                                         |

```ts
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "auto", // 'auto' | 'contain' | 'cover'
  interactiveWidget: "resizes-visual", // 'resizes-visual' | 'resizes-content' | 'overlays-content'
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
  colorScheme: "normal", // 'normal' | 'light' | 'dark' | 'light dark' | 'dark light' | 'only light'
};
```

---

## `generateStaticParams()`

Generates route params at build time for static generation of dynamic routes.

### Signature

```ts
export async function generateStaticParams(): Promise<
  Array<Record<string, string | string[]>>
>;
```

```ts
// app/blog/[slug]/page.tsx
export async function generateStaticParams() {
  const posts = await db.post.findMany({ select: { slug: true } });
  return posts.map((post) => ({ slug: post.slug }));
}

// app/[lang]/[slug]/page.tsx — multiple dynamic params
export async function generateStaticParams() {
  const posts = await db.post.findMany();
  return posts.flatMap((post) =>
    ["en", "es", "fr"].map((lang) => ({ lang, slug: post.slug })),
  );
}

// app/docs/[...path]/page.tsx — catch-all
export function generateStaticParams() {
  return [{ path: ["guide", "installation"] }, { path: ["api", "reference"] }];
}
```

### Partial Generation + `dynamicParams`

```ts
// Generate top 100 at build time; dynamically render the rest
export const dynamicParams = true; // default: true
export async function generateStaticParams() {
  const top100 = await db.post.findMany({ take: 100 });
  return top100.map((p) => ({ slug: p.slug }));
}

// generateStaticParams can access parent params
export async function generateStaticParams({
  params: { locale },
}: {
  params: { locale: string };
}) {
  const posts = await getPostsForLocale(locale);
  return posts.map((p) => ({ slug: p.slug }));
}
```

---

## `generateImageMetadata()`

Generates multiple image variants for a single route. Used alongside `opengraph-image.tsx`.

### Signature

```ts
type ImageMetadata = {
  id: string | number;
  alt?: string;
  size?: { width: number; height: number };
  contentType?:
    | "image/png"
    | "image/jpeg"
    | "image/gif"
    | "image/svg+xml"
    | "image/webp";
};

export function generateImageMetadata(props: {
  params: Promise<Record<string, string>>;
}): ImageMetadata[] | Promise<ImageMetadata[]>;
```

```ts
// app/products/[id]/opengraph-image.tsx
export async function generateImageMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return [
    { id: 'square', size: { width: 1200, height: 1200 }, contentType: 'image/png' },
    { id: 'wide',   size: { width: 1200, height: 630  }, contentType: 'image/png' },
  ]
}

export default async function Image({
  params,
  id,
}: {
  params: Promise<{ id: string }>
  id: Promise<string | number>   // ← separate prop from generateImageMetadata return value
}) {
  const { id: productId } = await params
  const imageId = await id       // 'square' | 'wide' — the id returned by generateImageMetadata
  const size = imageId === 'square' ? 1200 : 630
  const product = await getProduct(productId)
  return new ImageResponse(<div>{product.name}</div>, { width: 1200, height: size })
}
```

---

## `generateSitemaps()`

Generates multiple paginated sitemaps for large sites.

### Signature

```ts
export function generateSitemaps():
  | Array<{ id: number | string }>
  | Promise<Array<{ id: number | string }>>;
```

```ts
// app/sitemap.ts
import type { MetadataRoute } from "next";

export async function generateSitemaps() {
  const totalPosts = await db.post.count();
  const pages = Math.ceil(totalPosts / 50000); // max 50,000 URLs per sitemap
  return Array.from({ length: pages }, (_, i) => ({ id: i }));
}

export default async function sitemap(props: {
  id: Promise<string>;
}): Promise<MetadataRoute.Sitemap> {
  const id = Number(await props.id);
  const posts = await db.post.findMany({
    skip: id * 50000,
    take: 50000,
    select: { slug: true, updatedAt: true },
  });
  return posts.map((post) => ({
    url: `https://example.com/blog/${post.slug}`,
    lastModified: post.updatedAt,
    changeFrequency: "weekly",
    priority: 0.8,
  }));
}
```

Accessible at: `/sitemap/0.xml`, `/sitemap/1.xml`, etc.

### Full `MetadataRoute.Sitemap` entry type

```ts
type SitemapEntry = {
  url: string;
  lastModified?: string | Date;
  changeFrequency?:
    | "always"
    | "hourly"
    | "daily"
    | "weekly"
    | "monthly"
    | "yearly"
    | "never";
  priority?: number; // 0.0–1.0; default 0.5
  alternates?: {
    languages?: Record<string, string>; // locale -> absolute URL (hreflang)
  };
  images?: string[]; // Google Image Sitemap URLs
  videos?: Array<{
    // Google Video Sitemap entries
    title: string;
    thumbnail_loc: string; // absolute URL
    description: string;
    content_loc?: string;
    player_loc?: string;
    duration?: number; // seconds
    expiration_date?: Date | string;
    rating?: number; // 0.0–5.0
    view_count?: number;
    publication_date?: Date | string;
    family_friendly?: "yes" | "no";
    restriction?: { relationship: "allow" | "deny"; content: string };
    platform?: { relationship: "allow" | "deny"; content: string };
    requires_subscription?: "yes" | "no";
    uploader?: { info?: string; content?: string };
    live?: "yes" | "no";
    tag?: string;
  }>;
};
```

> Use `images` for Google Image sitemaps and `videos` for Google Video sitemaps — Google uses these to enrich search results. Both accept absolute URLs.

---

## `ImageResponse`

Creates a PNG/JPEG image from React JSX for OG images. Import from `next/og`.

```ts
import { ImageResponse } from "next/og";
```

### Signature

```ts
new ImageResponse(
  element: ReactElement,
  options?: ImageResponseOptions
): Response
```

### `ImageResponseOptions`

| Option       | Type                                                                          | Default     | Description                 |
| ------------ | ----------------------------------------------------------------------------- | ----------- | --------------------------- |
| `width`      | `number`                                                                      | `1200`      | Image width in px           |
| `height`     | `number`                                                                      | `630`       | Image height in px          |
| `emoji`      | `'twemoji' \| 'openmoji' \| 'blobmoji' \| 'noto' \| 'fluent' \| 'fluentFlat'` | `'twemoji'` | Emoji renderer              |
| `fonts`      | `FontOptions[]`                                                               | —           | Custom fonts                |
| `debug`      | `boolean`                                                                     | `false`     | Show visual debugging       |
| `headers`    | `Record<string, string>`                                                      | —           | Additional response headers |
| `status`     | `number`                                                                      | `200`       | HTTP status code            |
| `statusText` | `string`                                                                      | —           | HTTP status text            |

### `FontOptions`

```ts
type FontOptions = {
  name: string;
  data: Buffer | ArrayBuffer; // both node Buffer and web ArrayBuffer accepted
  weight?: 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;
  style?: "normal" | "italic";
  lang?: string;
};
```

```ts
// app/opengraph-image.tsx
import { ImageResponse } from 'next/og'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
  const fontData = await fetch(
    new URL('../public/fonts/Inter-Bold.ttf', import.meta.url)
  ).then(res => res.arrayBuffer())

  return new ImageResponse(
    (
      <div style={{
        display: 'flex',
        background: 'linear-gradient(135deg, #667eea, #764ba2)',
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <h1 style={{ color: '#fff', fontSize: 72, fontWeight: 'bold' }}>
          My App
        </h1>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: 'Inter', data: fontData, weight: 700, style: 'normal' },
      ],
    }
  )
}
```

### JSX Limitations in `ImageResponse`

| Supported                          | Not Supported                  |
| ---------------------------------- | ------------------------------ |
| Flexbox layout                     | CSS Grid                       |
| `display: flex`                    | `display: block` (limited)     |
| Absolute positioning               | `overflow: hidden` on non-root |
| Linear/radial gradients            | All CSS animations             |
| `background-image` with URL        | External CSS files             |
| Inline styles                      | `className`                    |
| SVG (inline)                       | Most CSS pseudo-selectors      |
| `tw` prop (Tailwind, experimental) | —                              |

**`tw` prop** — `@vercel/og` augments `React.HTMLAttributes` with an experimental `tw?: string` prop that accepts Tailwind CSS utility classes as a layout shorthand inside `ImageResponse` JSX. It is distinct from `className` (which is not supported):

```tsx
// ✅ Tailwind via tw prop (experimental)
<div tw="flex w-full h-full items-center justify-center bg-blue-200">
  <span tw="text-6xl font-bold text-white">Hello world</span>
</div>

// ❌ className does not work inside ImageResponse
<div className="flex w-full h-full">…</div>
```

> If both `tw` and `style` are set on the same element, `style` takes precedence.
