---
name: "Extract Design Tokens"
agent: "agent"
description: "Analyze a design mockup or screenshot and extract design tokens to globals.css Tailwind v4 @theme block"
tools:
  [
    vscode,
    execute,
    read,
    agent,
    edit,
    search,
    browser,
    "io.github.upstash/context7/*",
  ]
---

# Extract Design Tokens from Mockup

Analyze a design reference (screenshot or URL) and map the visual properties to Tailwind CSS v4 custom properties in `app/globals.css`.

**Always read `.github/instructions/nextjs-tailwind.instructions.md` before starting.**

---

## Input

Provide one of the following:

- **Screenshot / image** — attach the file or drag it into chat
- **Live URL** — the agent will use the browser tool to screenshot and inspect the page

---

## Instructions

### Step 1 — Analyze the design reference

Extract the following values from the design reference. Measure visually or read from the source if available:

**Typography**

- Font families (heading, body, mono)
- Type scale: all font sizes in use (identify the base unit)
- Font weights used
- Line heights
- Letter spacing (if non-default)

**Colors**

- Primary / brand color (and 3–5 tonal variants if visible)
- Neutral / gray scale (5–9 steps)
- Semantic colors: success, warning, error, info
- Background and surface colors
- Text colors (default, muted, inverted)
- Border color

**Spacing**

- Base spacing unit (usually 4px or 8px)
- Identify the spacing scale in use (4px increments? 8px?)

**Shape**

- Border radius values (none, sm, md, lg, full)
- Shadow levels (if any)

**Motion** (optional)

- Default transition duration and easing

### Step 2 — Create `docs/design-tokens.md`

Document every extracted token in a Markdown table:

```markdown
## Typography

| Token     | Value               | Usage     |
| --------- | ------------------- | --------- |
| font-sans | "Inter", sans-serif | Body text |

...

## Colors

| Token | Value (hex/oklch) | Usage |
...
```

Save the file to `docs/design-tokens.md`.

### Step 3 — Map to Tailwind v4 `@theme` block

Open `app/globals.css`. Inside the `@theme` block (create it if missing), add all extracted tokens as CSS custom properties following Tailwind v4 naming conventions:

```css
@theme {
  /* Typography */
  --font-sans: "Inter", sans-serif;
  --font-heading: "Cal Sans", sans-serif;

  /* Colors — use oklch() for perceptual uniformity */
  --color-primary: oklch(0.55 0.22 250);
  --color-primary-foreground: oklch(0.98 0 0);
  --color-neutral-50: oklch(0.985 0 0);
  /* ... */

  /* Spacing */
  --spacing-xs: 0.25rem; /* 4px */
  --spacing-sm: 0.5rem; /* 8px */
  /* ... */

  /* Radius */
  --radius-sm: 0.25rem;
  --radius-md: 0.375rem;
  --radius-lg: 0.5rem;
  --radius-full: 9999px;
}
```

### Step 4 — Apply tokens to existing components (optional)

If the user asks to apply the extracted tokens to the existing UI:

1. Identify which Tailwind utility classes in `components/ui/*.tsx` should map to the new custom properties.
2. Spawn sub-agents for each component file — one sub-agent per file — to apply the token substitutions in parallel.
3. Run `pnpm lint && pnpm type-check` after all sub-agents complete.

### Step 5 — Summary

Output:

- Number of tokens extracted per category
- Path to `docs/design-tokens.md`
- List of CSS variables added to `app/globals.css`
- Any design values that could not be mapped (require manual decision)

---

## Notes on Tailwind v4

- Config is CSS-first — no `tailwind.config.js`. All customization goes inside `@theme {}` in `globals.css`.
- Use `@import "tailwindcss"` at the top of `globals.css` (not `@tailwind base/components/utilities`).
- Prefer `oklch()` over hex for colors — perceptually uniform, better for generating tonal palettes.
- Tokens defined in `@theme` are automatically available as Tailwind utility classes (e.g., `--color-primary` → `bg-primary`, `text-primary`).
