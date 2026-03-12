---
name: "check-news"
agent: "agent"
description: "Fetch the latest posts from all configured RSS/Atom feeds and evaluate which items are actionable for the Next.js 16 starter template."
tools: ["rss-feed/list_latest_posts", "rss-feed/get_feed", web, read, search]
---

# check-news — Template news radar

Scans all configured feed sources and produces a prioritized report of what matters for this template.

## Instructions

### 1. Fetch the latest posts from every feed alias

Call `rss-feed/list_latest_posts` with `limit: 8` for **each of the following aliases** — call them all, do not skip any:

```
nextjs · typescript · tailwindcss · react · vscode · github · copilot · anthropic · zod · zustand · vitest · playwright
```

In addition, use the `web` tool to fetch `https://www.anthropic.com/news` and extract the 5–8 most recent post titles and dates (Anthropic has no RSS feed; Claude Code releases cover releases but not blog posts).

Collect everything into a unified list of items before evaluating.

### 2. Read template context (once)

Read the following files so you can check whether a finding is already documented or implemented:

- `.github/copilot-instructions.md` (§Knowledge Reminders, §Tech Stack)
- `package.json` (current pinned versions)

### 3. Classify every item

Apply this decision tree to each collected item:

| Tier                  | When to assign                                                                                                                                                                         | Action                                                               |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| 🔴 **Must act**       | Security patch, breaking change, or deprecation that directly affects pinned versions in `package.json`                                                                                | List the exact `package.json` version line and the file(s) to update |
| 🟡 **Worth watching** | New feature, minor release, or blog post relevant to the template's stack (Next.js 16, React 19, TypeScript 5, Tailwind v4, Auth.js v5, Zod v4, Vitest v4, Playwright, Copilot/Claude) | Describe the feature and where it could be adopted                   |
| ⚪ **Not relevant**   | Unrelated tech, personal opinions, marketing only, or already documented in `copilot-instructions.md`                                                                                  | One-line dismissal                                                   |

**Relevance filter — discard any item that:**

- Is about a technology not in the stack
- Has already been documented in `copilot-instructions.md` or `AGENTS.md`
- Is purely promotional with no technical substance
- Predates the current pinned version (i.e. already included in what we have)

### 4. Produce the report

Output a Markdown report with exactly these sections:

```markdown
## 📰 News check — <today's date>

### 🔴 Must act (<N> items)

<!-- One entry per item -->

**[Source] Title**

- What: <one sentence>
- Affects: `<exact file path or package.json line>`
- Action: <what to do, e.g. "run `pnpm update next`", "add deprecation note to nextjs.instructions.md">

---

### 🟡 Worth watching (<N> items)

<!-- One entry per item -->

**[Source] Title** — <link>

- Why relevant: <one sentence>
- Potential adoption: <where in the template this could improve things>

---

### ⚪ Skipped

<bulleted list, one line each: "[Source] Title — reason skipped">

---

### Sources checked

| Alias  | Feed title | Items fetched | Oldest item date |
| ------ | ---------- | ------------- | ---------------- |
| nextjs | ...        | ...           | ...              |
| ...    |            |               |                  |
```

### 5. Do not implement any changes

This prompt is analysis-only. Present the report and wait for the user to decide what to implement.
