---
description: "MDX and Markdown rendering in Next.js 16.1.6 App Router — setup, patterns, caching, and styling conventions."
applyTo: "content/**, posts/**, **/*.mdx, **/*.md, mdx-components.tsx, mdx-components.js"
---

# MDX & Markdown Rendering — Next.js 16.1.6

> **Scope**: This file covers **rendering** Markdown/MDX inside a Next.js app (blog, docs, landing pages). For formatting rules when writing `.md` documentation files, see `.github/instructions/markdown.instructions.md`.

---

## 1. When to use MDX vs plain Markdown vs next-mdx-remote

| Scenario                                          | Approach                                                            |
| ------------------------------------------------- | ------------------------------------------------------------------- |
| Content lives in the repo (blog, docs, changelog) | `@next/mdx` — compiled at build time, zero JS overhead              |
| Content lives in a headless CMS / database / S3   | `next-mdx-remote` — fetched and rendered at request time or via ISR |
| Content is pure text, no React components needed  | Plain `.md` with `remark`/`rehype` pipeline in a Server Component   |
| Interactive docs with live code examples          | MDX with client component islands                                   |

**Do not** reach for `next-mdx-remote` if content is already in the repo — `@next/mdx` gives better build-time type safety and zero runtime bundle cost.

---

## 2. Required packages

```bash
pnpm add @next/mdx @mdx-js/loader @mdx-js/react @types/mdx
```

For frontmatter support (recommended):

```bash
pnpm add remark-frontmatter remark-mdx-frontmatter
```

---

## 3. `next.config.ts` — mandatory configuration

```ts
import createMDX from "@next/mdx";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Add md and mdx to page extensions so they can be used as routes
  pageExtensions: ["js", "jsx", "md", "mdx", "ts", "tsx"],
  // ... rest of config
};

const withMDX = createMDX({
  // Handle both .md and .mdx files
  extension: /\.(md|mdx)$/,
  options: {
    // ⚠️ Turbopack requires plugin names as STRINGS, not imported functions.
    // JavaScript functions cannot be serialized to Rust.
    remarkPlugins: [
      "remark-gfm", // GitHub Flavored Markdown
      "remark-frontmatter", // Parse YAML frontmatter blocks
      ["remark-mdx-frontmatter", { name: "metadata" }], // Export frontmatter as `metadata`
    ],
    rehypePlugins: [
      "rehype-slug", // Add id to headings
      "rehype-autolink-headings", // Clickable heading anchors
    ],
  },
});

export default withMDX(nextConfig);
```

> **Critical**: When using `pnpm dev` (Turbopack), plugins MUST be specified as **strings** (package names), never as imported functions. Using `[remarkGfm]` (a JS function) with Turbopack silently fails — the plugin is ignored without an error.

---

## 4. `mdx-components.tsx` — required for App Router

This file is **mandatory**. `@next/mdx` will throw a build error without it. Place it at the project root (same level as `app/`).

```tsx
// mdx-components.tsx
import type { MDXComponents } from "mdx/types";
import Image, { type ImageProps } from "next/image";

const components = {
  // Replace plain <img> with next/image for optimization
  img: (props: ImageProps) => (
    <Image sizes="100vw" style={{ width: "100%", height: "auto" }} {...props} />
  ),
} satisfies MDXComponents;

export function useMDXComponents(): MDXComponents {
  return components;
}
```

---

## 5. Directory structure convention

Place content outside `app/` to separate routing from source files:

```
app/
  blog/
    [slug]/
      page.tsx      # Loads MDX dynamically via import()
    page.tsx        # Blog index — reads metadata from all files
    layout.tsx      # Applies prose styling via @tailwindcss/typography
content/            # All MDX/Markdown source files (not routable on their own)
  blog/
    hello-world.mdx
    getting-started.mdx
mdx-components.tsx  # Root, required by @next/mdx
```

**Never** put MDX content files directly inside `app/` unless they are simple standalone pages that need no data layer.

---

## 6. Rendering patterns

### 6a. Dynamic blog route (recommended for content sites)

```tsx
// app/blog/[slug]/page.tsx
import type { Metadata } from "next";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function BlogPostPage({ params }: Readonly<PageProps>) {
  const { slug } = await params;
  const { default: Post, metadata } = await import(
    `@/content/blog/${slug}.mdx`
  );

  return <Post />;
}

export function generateStaticParams() {
  // Return all known slugs — required when dynamicParams = false
  return [{ slug: "hello-world" }, { slug: "getting-started" }];
}

// 404 for any slug not in generateStaticParams
export const dynamicParams = false;

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const { metadata } = await import(`@/content/blog/${slug}.mdx`);
  return {
    title: metadata?.title,
    description: metadata?.description,
  };
}
```

### 6b. Simple MDX page (file-based routing)

```
app/
  about/
    page.mdx    ← MDX file IS the page
```

```mdx
# About us

This page is written directly in MDX.

import { TeamCard } from "@/components/ui/team-card";

<TeamCard />
```

### 6c. Import MDX into a page

```tsx
// app/changelog/page.tsx
import Changelog from "@/content/changelog.mdx";

export default function ChangelogPage() {
  return (
    <div className="prose dark:prose-invert max-w-4xl mx-auto">
      <Changelog />
    </div>
  );
}
```

---

## 7. Frontmatter

`@next/mdx` does not support YAML frontmatter by default. Use the `remark-mdx-frontmatter` plugin (configured in step 3) to export frontmatter as an ES module named export:

```mdx
---
title: "Hello World"
description: "My first post"
publishedAt: "2026-03-14"
author: "Jane Doe"
---

# Hello World

Post content here.
```

Access it from the importing page:

```tsx
import Post, { metadata } from "@/content/blog/hello-world.mdx";

// metadata = { title: 'Hello World', description: '...', publishedAt: '...', author: '...' }
```

Define a Zod schema to validate frontmatter at build time:

```ts
// lib/schemas/post.schema.ts
import { z } from "zod";

export const postMetadataSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  publishedAt: z.string().date(),
  author: z.string().min(1),
});

export type PostMetadata = z.infer<typeof postMetadataSchema>;
```

---

## 8. Caching MDX content (Next.js 16 — `use cache`)

In Next.js 16 with `cacheComponents: true`, cache the MDX-reading logic with `'use cache'`:

```ts
// lib/content.ts
import "server-only";
import { cacheTag, cacheLife } from "next/cache";
import { postMetadataSchema } from "@/lib/schemas/post.schema";

export async function getAllPosts() {
  "use cache";
  cacheLife("days");
  cacheTag("posts");

  // Dynamic imports for all MDX files — server-side only
  const posts = await Promise.all(
    ["hello-world", "getting-started"].map(async (slug) => {
      const { metadata } = await import(`@/content/blog/${slug}.mdx`);
      return { slug, ...postMetadataSchema.parse(metadata) };
    }),
  );

  return posts.sort(
    (a, b) =>
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  );
}
```

> **Do not** use `export const revalidate` — it is deprecated when `cacheComponents: true` is enabled. Use `cacheLife()` inside a `'use cache'` function instead.

> **Do not** use `export const dynamic = 'force-static'` — also deprecated with `cacheComponents: true`.

---

## 9. Styling MDX content — `@tailwindcss/typography`

Apply `@tailwindcss/typography` in the segment layout, not inline per component:

```bash
pnpm add @tailwindcss/typography
```

In `app/globals.css` (Tailwind v4 CSS-first config — no `tailwind.config.js`):

```css
@import "tailwindcss";
@plugin "@tailwindcss/typography";
```

In the layout wrapping MDX routes:

```tsx
// app/blog/layout.tsx
export default function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="prose prose-lg dark:prose-invert max-w-4xl mx-auto px-4 py-8">
      {children}
    </div>
  );
}
```

Common `prose` modifier patterns:

| Class                          | Effect                                                   |
| ------------------------------ | -------------------------------------------------------- |
| `prose-lg`                     | Larger base font size                                    |
| `dark:prose-invert`            | Dark mode inverts text/code colors                       |
| `prose-headings:font-semibold` | Custom heading weight                                    |
| `prose-a:text-blue-600`        | Custom link color                                        |
| `prose-pre:bg-zinc-900`        | Code block background                                    |
| `max-w-none`                   | Remove max-width constraint (when parent controls width) |

---

## 10. Custom components in MDX

Override HTML elements globally via `mdx-components.tsx`:

```tsx
// mdx-components.tsx
import type { MDXComponents } from "mdx/types";
import Image, { type ImageProps } from "next/image";
import { cn } from "@/lib/utils";

const components = {
  // Replace img with next/image
  img: (props: ImageProps) => (
    <Image sizes="100vw" style={{ width: "100%", height: "auto" }} {...props} />
  ),
  // Style inline code to match design system
  code: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => (
    <code
      className={cn(
        "rounded bg-zinc-100 px-1.5 py-0.5 text-sm dark:bg-zinc-800",
        className,
      )}
    >
      {children}
    </code>
  ),
} satisfies MDXComponents;

export function useMDXComponents(): MDXComponents {
  return components;
}
```

Override locally per page by passing `components` prop:

```tsx
import Post from "@/content/getting-started.mdx";

const overrides = {
  h1: ({ children }) => (
    <h1 className="text-4xl font-bold text-primary">{children}</h1>
  ),
};

export default function GettingStartedPage() {
  return <Post components={overrides} />;
}
```

---

## 11. TypeScript — declare `.mdx` module types

Add MDX module type declarations so TypeScript accepts `import Post from '*.mdx'`:

```ts
// types/mdx.d.ts  (or add to types/index.ts)
declare module "*.mdx" {
  import type { MDXProps } from "mdx/types";

  const MDXComponent: (props: MDXProps) => JSX.Element;
  export default MDXComponent;

  // Frontmatter exported via remark-mdx-frontmatter
  export const metadata: Record<string, unknown>;
}
```

---

## 12. Pitfalls to avoid

- **Never** use remark/rehype plugins as imported functions in `next.config.ts` when using Turbopack (`pnpm dev`) — use string package names only.
- **Never** skip `mdx-components.tsx` — App Router requires it; the build fails without it.
- **Never** use `export const dynamic = 'force-static'` or `export const revalidate` in MDX-serving page routes — they are deprecated with `cacheComponents: true`.
- **Never** load MDX files from the filesystem with `fs.readFile` and render them with `dangerouslySetInnerHTML` — sanitization is not automatic; use `rehype-sanitize` in the pipeline if you must process user-supplied content.
- **Never** import `gray-matter` or `fs` in Client Components — MDX file reading is server-only.

## Learnings
