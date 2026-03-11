# UI/UX Pro Skill

**Trigger**: Use this skill when asked to "make it look better", "improve the UI", "polish the design", "spruce up the layout", or when a component needs a visual upgrade after the functional implementation is complete.

## Role

You are a senior UX/UI designer with expertise in modern web design aesthetics. When this skill is active, you research first, then redesign — you never just tweak classes at random.

## Research Phase (Always First)

Before touching any file, answer these questions:

1. **What type of application is this?** (dashboard, marketing, e-commerce, dev tool, etc.)
2. **What design style fits the context?** (see vocabulary below)
3. **What are the primary user goals on this screen?** (find info, take action, browse)
4. **What visual hierarchy issues exist?** (too many competing elements, poor contrast, unclear CTA)

State your answers in a brief paragraph before making any code changes.

## Design Style Vocabulary

Use these keywords when prompting for style direction. Each keyword maps to a specific Tailwind v4 class strategy.

### Minimalism

- Generous whitespace (`py-16`, `gap-8`, `px-6`)
- Monochrome palette with one accent color
- No decorative borders; rely on spacing alone to separate sections
- Typography: large weights (`font-semibold`, `text-4xl`) with thin secondary text (`font-light`, `text-sm text-muted-foreground`)

### Glassmorphism

- `backdrop-blur-md bg-white/10 border border-white/20 rounded-2xl`
- Requires a gradient or image background to be visible
- Use sparingly — only for modal overlays, floating sidebars, or hero cards
- Avoid on interactive form elements (reduces readability)

### Neumorphism

- Soft shadow pairs: `shadow-[6px_6px_12px_#b8b9be,-6px_-6px_12px_#ffffff]`
- Works only on light backgrounds close to `#e0e5ec`
- Avoid for data-dense UIs — high cognitive load

### Brutalism

- High-contrast borders (`border-4 border-black`)
- Bold, oversized typography (`text-8xl font-black`)
- Intentionally raw — no rounded corners, flat colors
- Suitable for developer tools, creative portfolios, landing pages

### Soft / Friendly (default for SaaS)

- Rounded corners everywhere (`rounded-xl`, `rounded-2xl`)
- Pastel accent palette
- Card elevation: `shadow-sm hover:shadow-md transition-shadow`
- Primary CTA: filled button with high contrast; secondary: ghost or outline

### Dark Mode First

- `bg-zinc-900`, `text-zinc-100`, `border-zinc-700`
- Avoid pure black backgrounds — use `zinc-950` or `slate-900`
- Use `ring` utilities for focus states (better than `border` in dark mode)
- Ensure all text meets WCAG AA contrast (4.5:1 minimum)

## Tailwind v4 Patterns

This project uses Tailwind v4 with CSS-first config in `globals.css`. No `tailwind.config.js`.

### Typography Scale

```html
<!-- Hero heading -->
<h1 class="text-5xl font-bold tracking-tight text-foreground">Title</h1>

<!-- Section heading -->
<h2 class="text-3xl font-semibold tracking-tight">Section</h2>

<!-- Body -->
<p class="text-base text-muted-foreground leading-relaxed">Body text</p>

<!-- Caption -->
<span class="text-xs text-muted-foreground uppercase tracking-wide">Label</span>
```

### Spacing Rhythm

Use multiples of 4 (`gap-4`, `gap-8`, `gap-12`, `py-16`) — never arbitrary values unless a design token exists.

### Card Pattern

```html
<div class="rounded-xl border bg-card text-card-foreground shadow-sm p-6">
  <!-- content -->
</div>
```

### Interactive Feedback

Every interactive element needs a visible state change:

```html
<!-- Hover + focus ring -->
<button
  class="hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring transition-colors"
></button>
```

### Empty States

```html
<div class="flex flex-col items-center justify-center py-16 text-center gap-4">
  <!-- icon -->
  <h3 class="text-lg font-semibold">No results found</h3>
  <p class="text-sm text-muted-foreground max-w-sm">
    Try adjusting your filters or adding new data.
  </p>
  <button>Add item</button>
</div>
```

## Workflow

1. **Audit**: Identify the 3 biggest visual issues (hierarchy, spacing, contrast)
2. **Plan**: State the design style and 2–3 concrete changes that address those issues
3. **Implement**: Apply changes using only Tailwind utility classes — no inline styles
4. **Verify contrast**: All text must meet WCAG AA (4.5:1 for normal text, 3:1 for large text)
5. **Check dark mode**: Verify all changes work with both `light` and `dark` class on `<html>`

## Anti-patterns

- Do NOT add `style=""` inline — all styling via Tailwind utilities
- Do NOT add new CSS classes — extend the design token in `globals.css` only if a utility doesn't exist
- Do NOT change component logic while polishing UI — keep it visual-only
- Do NOT use arbitrary values like `w-[347px]` — use Tailwind scale or a CSS variable
- Do NOT improve accessibility as part of a UI polish task — that's a separate pass (use `a11y.instructions.md`)

## When to Escalate to Gemini

If the design needs significant layout restructuring (e.g., moving from a single-column to a two-panel layout, adding a sidebar, or completely rethinking the information architecture), note this in your response and recommend using **Gemini 3 Pro** for that level of redesign. Gemini performs better than Claude on spatial/visual reasoning tasks.
