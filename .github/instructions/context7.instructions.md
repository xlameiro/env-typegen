---
description: "Use Context7 automatically for authoritative, version-specific external documentation. Avoids hallucinating deprecated or wrong APIs."
applyTo: "**/*.ts, **/*.tsx, **/*.js, **/*.jsx, **/*.css"
---

# Context7-aware development

Use Context7 proactively whenever the task depends on **authoritative, current, or version-specific external documentation** not present in the workspace.

This instruction exists so you **do not require the user to type** "use context7" — use it automatically when appropriate.

## Next.js pre-flight requirement

For **any Next.js task**, call `next-devtools-init` (next-devtools MCP tool) **before querying Context7**. This resets the AI's Next.js knowledge baseline to v16.1.7 and prevents stale API patterns from LLM training data (Next.js 12/13/14).

### Skill selection for Next.js tasks

Load the matching skill before writing Next.js code. When in doubt, load `nextjs-best-practices` as the baseline.

| Feature type                                                        | Skill to load                                       |
| ------------------------------------------------------------------- | --------------------------------------------------- |
| Pages, layouts, routing, Suspense, streaming                        | `nextjs-app-router-patterns`                        |
| `'use cache'`, `cacheLife`, `cacheTag`, revalidation                | `nextjs-directives` + `nextjs-data-cache-functions` |
| `next.config.ts`                                                    | `nextjs-config`                                     |
| Built-in components (`<Image>`, `<Link>`, `<Font>`, `<Form>`)       | `nextjs-components`                                 |
| `generateMetadata`, SEO, sitemap, OG images                         | `nextjs-metadata-functions`                         |
| File conventions (`page.tsx`, `layout.tsx`, `route.ts`, `proxy.ts`) | `nextjs-file-conventions`                           |
| Navigation (`useRouter`, `redirect`, `notFound`, `usePathname`)     | `nextjs-navigation-functions`                       |
| Route Handlers, `NextRequest`/`NextResponse`                        | `nextjs-server-runtime`                             |
| General Next.js 16 patterns                                         | `nextjs-best-practices`                             |

---

## When to use Context7

Use before making decisions or writing code when you need:

- **Framework/library API details** — method signatures, config keys, expected behaviors
- **Version-sensitive guidance** — breaking changes, deprecations, new defaults
- **Correctness or security-critical patterns** — auth flows, crypto usage, middleware config
- **Unfamiliar error messages** from third-party tools
- **Best-practice constraints** — rate limits, required headers, supported formats

Also use when:

- User references a specific version (e.g., "Next.js 16", "React 19", "Auth.js v5", "Tailwind v4")
- You are about to write non-trivial configuration (next.config.ts, proxy.ts, auth options)
- You are unsure an API exists, changed names, or was deprecated

**Skip Context7 for:**

- Local refactors, formatting, naming, pure logic derivable from the repo
- Language fundamentals (TypeScript generics, array methods)

## Tool workflow

1. **If user provides a library ID** (e.g., `/vercel/next.js`), use it directly
2. **Otherwise, resolve it**:
   ```
   resolve-library-id: { libraryName: "next.js", query: "<current task>" }
   ```
3. **Fetch relevant docs**:
   ```
   query-docs: { libraryId: "/vercel/next.js", query: "<exact question>" }
   ```
4. **Then write the code** based on the retrieved docs

**Efficiency limits**: max 3 calls to `resolve-library-id` and 3 to `query-docs` per user request.

**Fallback**: If Context7 MCP tools are unavailable, rely on workspace code patterns, existing instruction files, and inline knowledge — do not block the task. Search `app/`, `lib/`, and `.github/instructions/` for existing implementations before making assumptions about APIs or patterns.

## How to cite results

When a decision relies on retrieved docs, cite: `title + URL`. If docs conflict, present tradeoffs and choose the safest default.

## Common libraries for this project

| Library      | Context7 ID                 |
| ------------ | --------------------------- |
| Next.js      | `/vercel/next.js`           |
| React        | `/facebook/react`           |
| Auth.js      | `/nextauthjs/next-auth`     |
| Zod          | `/colinhacks/zod`           |
| Tailwind CSS | `/tailwindlabs/tailwindcss` |
| Zustand      | `/pmndrs/zustand`           |
| Vitest       | `/vitest-dev/vitest`        |
| Playwright   | `/microsoft/playwright`     |
| Cheerio      | `/cheeriojs/cheerio`        |

## Learnings
