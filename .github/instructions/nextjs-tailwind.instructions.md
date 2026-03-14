---
description: "Next.js + Tailwind development standards and instructions"
applyTo: "**/*.tsx, **/*.ts, **/*.jsx, **/*.js, **/*.css"
---

# Next.js + Tailwind Development Instructions

Instructions for high-quality Next.js applications with Tailwind CSS styling and TypeScript.

## Project Context

- Latest Next.js (App Router)
- TypeScript for type safety
- Tailwind CSS for styling

## Rule precedence

- Use `.github/copilot-instructions.md` as the canonical source for cross-cutting conventions (naming, imports, auth placement, security, and quality gates).
- If this file conflicts with `.github/copilot-instructions.md`, follow `.github/copilot-instructions.md` and update this file to match.

## Development Standards

### Architecture

- App Router with server and client components
- Group routes by feature/domain
- Implement proper error boundaries
- Use React Server Components by default
- Leverage static optimization where possible

### TypeScript

- Strict mode enabled
- Clear type definitions
- Proper error handling with type guards
- Zod for runtime type validation

### Styling

- Tailwind CSS with consistent color palette — installed version: **v4.2.1**
- Responsive design patterns
- Dark mode support
- Follow container queries best practices
- Maintain semantic HTML structure
- **v4.1+ new utilities available**: `text-shadow-sm/md/lg/xl`, `mask-*` (masking with gradients/images), `inset-shadow-*` — use these before reaching for custom CSS

### State Management

- React Server Components for server state
- `useState` / `useReducer` / `useContext` for simple local client state
- **Zustand** for complex client UI state (project convention — one store per feature domain; do not use Redux)
- Proper loading and error states
- Optimistic updates where appropriate

### Data Fetching

- Server Components for direct database queries
- React `Suspense` + `loading.tsx` for loading states
- Proper error handling with `error.tsx` boundaries
- Cache invalidation via `updateTag()` inside Server Actions (immediate consistency) or `revalidateTag(tag, 'max')` for stale-while-revalidate — see `nextjs.instructions.md` §7

### Security

- Input validation and sanitization
- Proper authentication checks
- CSRF protection
- Rate limiting implementation
- Secure API route handling

### Performance

- Image optimization with next/image
- Font optimization with next/font
- Route prefetching
- Proper code splitting
- Bundle size optimization

## Implementation Process

1. Plan component hierarchy
2. Define types and interfaces
3. Implement server-side logic
4. Build client components
5. Add proper error handling
6. Implement responsive styling
7. Add loading states
8. Write tests

## MDX Prose Styling — `@tailwindcss/typography`

When rendering Markdown or MDX content (blog posts, docs, changelogs), use the `@tailwindcss/typography` plugin instead of writing custom prose styles.

### Installation

```bash
pnpm add @tailwindcss/typography
```

### Registration (Tailwind v4 — CSS-first, no `tailwind.config.js`)

```css
/* app/globals.css */
@import "tailwindcss";
@plugin "@tailwindcss/typography";
```

### Usage in layout

Apply `prose` classes in the layout that wraps MDX routes — not inline per component:

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

Common modifiers:

| Class                          | Effect                                        |
| ------------------------------ | --------------------------------------------- |
| `prose-lg`                     | Larger base font size                         |
| `dark:prose-invert`            | Dark mode text/code inversion                 |
| `max-w-none`                   | Remove max-width (when parent controls width) |
| `prose-headings:font-semibold` | Custom heading weight                         |
| `prose-a:text-primary`         | Custom link color via design token            |
| `prose-pre:bg-zinc-900`        | Code block background                         |

> **Do not** add `prose` styles directly on `<article>` or `<div>` tags scattered throughout the component tree — centralise them in the layout so they apply uniformly to all MDX content in that route segment.

## Learnings
