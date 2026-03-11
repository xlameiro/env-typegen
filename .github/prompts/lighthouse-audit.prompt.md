---
name: "Lighthouse Audit Fix"
agent: "agent"
description: "Apply Lighthouse report findings as automated fixes across this Next.js 16 codebase"
tools:
  [vscode, execute, read, agent, edit, search, "io.github.upstash/context7/*"]
---

# Lighthouse Audit — Automated Fixes

Apply findings from a Lighthouse JSON report as concrete code changes to this Next.js 16 / Tailwind CSS v4 / React 19 codebase.

**Always read `.github/instructions/performance-optimization.instructions.md` and `.github/instructions/a11y.instructions.md` before starting.**

---

## How to generate the report

Run this in the terminal before starting this prompt:

```bash
# Option 1 — pnpm script (if configured)
pnpm lighthouse

# Option 2 — Lighthouse CLI directly
npx lighthouse http://localhost:3000 --output=json --output-path=lighthouse-report.json --chrome-flags="--headless"

# Option 3 — Chrome DevTools
# Open DevTools → Lighthouse tab → Generate report → Download JSON
```

Then paste the JSON content below `## Report` at the end of this file, or reference the file path.

---

## Instructions

### Step 1 — Parse and categorize

Read the Lighthouse JSON. For each audit with `score < 0.9`, extract:

- Audit ID and title
- Category (Performance / Accessibility / SEO / Best Practices)
- Score and weight
- Description and `details` if present

Group findings by category. Sort by impact (weight × gap from 1.0) descending.

### Step 2 — Map to code changes

For each finding, identify the concrete change following this mapping:

| Lighthouse finding                            | Code fix                                                                                                     |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `uses-optimized-images` / `uses-webp-images`  | Replace `<img>` with `<Image>` from `next/image`; add `remotePatterns` to `next.config.ts` if needed         |
| `render-blocking-resources` (fonts)           | Replace `<link>` Google Fonts with `next/font/google`; verify `display: 'swap'`                              |
| `unused-javascript` / large JS payload        | Wrap heavy Client Components with `dynamic()` from `next/dynamic`; add `loading` skeleton                    |
| `color-contrast`                              | Update Tailwind color classes to meet WCAG AA contrast ratio (4.5:1 for body text)                           |
| `image-alt` / `button-name` / `aria-*`        | Add `alt`, `aria-label`, or semantic HTML following `a11y.instructions.md`                                   |
| `meta-description` / `document-title`         | Add or update `generateMetadata()` in the relevant `page.tsx`                                                |
| `uses-long-cache-ttl`                         | Add `Cache-Control` header in Route Handlers or `next.config.ts` headers                                     |
| `total-blocking-time` / `third-party-summary` | Lazy-load third-party scripts with `<Script strategy="lazyOnload">` from `next/script`                       |
| `cumulative-layout-shift`                     | Ensure `<Image>` has `width`/`height` or `fill` + positioned parent; add `aspect-ratio` to skeleton elements |

### Step 3 — Implement top 10 highest-impact fixes

Work through findings by impact score (highest weight × biggest gap first). Implement the top 10.

For each fix:

1. Read the relevant file first.
2. Apply the minimal change — do not refactor unrelated code.
3. Note the file and line changed.

### Step 4 — Verify

```bash
pnpm lint && pnpm type-check && pnpm build
```

All three must pass. If `pnpm build` fails, fix the error before continuing.

### Step 5 — Report

Output a summary table:

| Finding | Category | Before Score | Fix Applied | File Changed |
| ------- | -------- | ------------ | ----------- | ------------ |

---

## Report

<!-- Paste Lighthouse JSON here, or write the file path: -->

```json

```
