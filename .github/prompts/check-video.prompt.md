---
name: "check video"
agent: "agent"
description: "Transcribe and analyze a YouTube video looking for improvements applicable to the Next.js 16 + VS Code + Copilot template. Usage: /check-video <url>"
tools: ["youtube-transcript/get_transcript", read, search, web]
---

# check-video — YouTube video analyzer for the template

> **Usage**: `/check-video <url>` where `<url>` is a YouTube video URL.

## Instructions

1. **Get the transcript** of the video at `$url` using the `youtube-transcript/get_transcript` tool.
   - Try English first (`lang: "en"`).
   - If it fails or the transcript is empty, try `lang: "es"`.
   - If it fails again, try without specifying `lang`.

2. **Read the template reference files** to understand what is already documented (do not repeat existing content):
   - `.github/copilot-instructions.md`
   - `AGENTS.md`
   - `.github/hooks/hooks.json`
   - `.github/hooks/scripts/` (list available files)
   - `.agents/skills/` (list subdirectories — no need to read every SKILL.md, just the names)

3. **Analyze the transcript** looking for the following — filter only what is relevant to this stack:

   | Category              | What to look for                                                                                  |
   | --------------------- | ------------------------------------------------------------------------------------------------- |
   | **VS Code / Copilot** | New VS Code or GitHub Copilot features not documented in `copilot-instructions.md` or `AGENTS.md` |
   | **Agent patterns**    | Hooks, skills, `/fork`, message steering, fleet, autopilot, approval modes                        |
   | **Next.js / React**   | App Router, caching (`use cache`), Server Components, React 19, new APIs, deprecations            |
   | **Testing**           | Vitest, Playwright, new testing capabilities                                                      |
   | **DX**                | TypeScript, Zod, Tailwind, Auth.js, CVA, pnpm — improvements or breaking changes                  |
   | **Security**          | Vulnerabilities, deprecated unsafe patterns, new OWASP recommendations                            |

4. **Discard any finding** that meets any of these conditions:
   - Already documented or implemented in the template
   - Does not apply to this stack (Next.js 16 + React 19 + TypeScript 5 strict + Tailwind v4 + pnpm + Auth.js v5)
   - Is a personal opinion or preference without objective technical basis
   - Is advertising or promotional content with no technical value

5. **Produce a Markdown report** with exactly these sections:

   ```markdown
   ## Source

   **Title**: <video title>
   **URL**: <url>

   ## Relevant findings

   1. **<Short title>** — <finding description + why it applies to the template>
   2. ...

   ## Discarded findings (optional)

   - <Finding>: <brief reason>

   ## Action plan

   | #   | Finding | File to modify                    | Suggested change |
   | --- | ------- | --------------------------------- | ---------------- |
   | 1   | ...     | `.github/copilot-instructions.md` | ...              |

   ## Files to create (only if applicable)

   - `<path>` — <purpose>
   ```

6. **Do not implement any changes**. The goal is to produce the report so the user can decide what to implement.

## Additional notes

- If the video is unrelated to VS Code, GitHub Copilot, Next.js, React, TypeScript, Zustand, Playwright, developer productivity, LLMs, or agent patterns, output `**No relevant findings for this template**` and briefly explain what the video is about.
- Keep findings concise — 3 lines maximum per item.
- Prioritize findings by impact: security first, then breaking changes, then DX improvements.
