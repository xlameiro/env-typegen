# Next.js 16 Starter Template

A production-ready Next.js 16 starter with TypeScript 5 strict, React 19, Tailwind CSS v4, Auth.js v5, Zod, Vitest, Playwright, and a full GitHub Copilot AI setup.

## Stack

| Layer           | Choice                           |
| --------------- | -------------------------------- |
| Framework       | Next.js 16.1.6 (App Router)      |
| Runtime         | React 19                         |
| Language        | TypeScript 5 strict mode         |
| Styling         | Tailwind CSS v4                  |
| Auth            | Auth.js v5 (NextAuth)            |
| Validation      | Zod v4                           |
| State           | Zustand v5 (client only)         |
| Unit tests      | Vitest + Testing Library         |
| E2E tests       | Playwright                       |
| Package manager | pnpm                             |
| Git hooks       | Husky + lint-staged + commitlint |

## Project Structure

```
app/                    # Next.js App Router
  api/
    auth/[...nextauth]/ # Auth.js route handler
    health/             # Health check endpoint
  error.tsx             # Route-level error boundary
  global-error.tsx      # Root error boundary
  globals.css           # Global styles + Tailwind tokens
  layout.tsx            # Root layout (metadata, skip link, viewport)
  loading.tsx           # Accessible global loading spinner
  not-found.tsx         # 404 page
  page.tsx              # Home page
components/
  ui/                   # Reusable UI primitives
    badge.tsx           # Badge (variants: default, success, warning, danger…)
    button.tsx          # Button (variants + sizes + loading state)
    button-link.tsx     # ButtonLink — semantic <a> with button styles (CVA)
    card.tsx            # Card, CardHeader, CardTitle, CardContent, CardFooter
    form.tsx            # FormField, FormInput, FormError — accessible RHF wrappers
    google-icon.tsx     # Google SVG icon for OAuth sign-in buttons
    skeleton.tsx        # Skeleton loading placeholder
hooks/                  # Client-side React hooks
  use-debounce.ts
  lib/                    # Shared utilities + configuration
  auth.ts               # getSession(), requireAuth() server helpers
  constants.ts          # APP_NAME, ROUTES, API_ROUTES
  dates.ts              # Temporal-based date utilities (formatDate, toISOString…)
  errors.ts             # Typed AppError class and error helpers
  env.ts                # @t3-oss/env-nextjs validated environment variables
  rate-limit.ts         # In-memory sliding window rate limiter
  schemas/
    user.schema.ts      # Zod v4 schemas: signIn, signUp, user CRUD
  utils.ts              # cn(), formatDate(), formatCurrency(), truncate()
store/                  # Zustand stores
  use-app-store.ts      # theme + sidebar, persisted to localStorage
tests/                  # Playwright E2E tests
  auth.spec.ts          # Auth page rendering + redirect behaviour
  dashboard.spec.ts     # Dashboard unauthenticated redirect
  home.spec.ts          # Home page content
  profile.spec.ts       # Profile unauthenticated redirect
  settings.spec.ts      # Settings unauthenticated redirect
types/
  index.ts              # ApiResponse<T>, PaginatedResponse<T>, Theme, Status…
auth.ts                 # Auth.js v5 config (Google, session callbacks)
proxy.ts                # Route protection + auth redirect
playwright.config.ts
vitest.config.ts
vitest.setup.ts
commitlint.config.ts
```

## Getting Started

### 1. Install dependencies

```bash
pnpm install
```

### 2. Environment variables (auto-generated)

`.env.local` is created automatically during `pnpm install` via a `postinstall` hook — no manual copy needed. The script generates a cryptographically secure `AUTH_SECRET` for you.

To regenerate or create it manually:

```bash
pnpm setup
```

Fill in OAuth credentials in `.env.local` **only if your project uses authentication**:

```env
# Required only when using OAuth
AUTH_GOOGLE_ID=...
AUTH_GOOGLE_SECRET=...
```

> `AUTH_SECRET` is optional — the app boots and serves pages without it. Auth.js only needs it when authentication routes are hit.

### 3. Start development

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

> **HTTPS tip**: Use `pnpm dev:local:https` when you need local HTTPS (e.g. some OAuth providers, HTTP/2 performance testing, or working with multiple projects on port 3000 simultaneously). It uses [Portless](https://port1355.dev) to add automatic TLS certificates and a named `.localhost` domain — no manual cert setup required.
>
> ```bash
> pnpm dev:local:https
> # Opens: https://nextjs16-starter-template.localhost
> ```
>
> Add `https://nextjs16-starter-template.localhost/api/auth/callback/google` as an **Authorized redirect URI** in [Google Cloud Console](https://console.cloud.google.com/) and set `NEXT_PUBLIC_APP_URL=https://nextjs16-starter-template.localhost` in your `.env.local`.

## Scripts

| Script                     | Description                                                                            |
| -------------------------- | -------------------------------------------------------------------------------------- |
| `pnpm setup`               | Generate `.env.local` from `.env.example` (run once per clone)                         |
| `pnpm clean:examples`      | Remove template examples (interactive auth keep/remove; non-TTY defaults to keep-auth) |
| `pnpm clean:examples:full` | Remove all template artifacts, including auth-related files                            |
| `pnpm dev`                 | Start development server                                                               |
| `pnpm dev:local`           | Dev with stable `.localhost` URL (Portless)                                            |
| `pnpm dev:local:https`     | Dev with HTTPS + named `.localhost` URL (Portless)                                     |
| `pnpm build`               | Production build                                                                       |
| `pnpm start`               | Start production server                                                                |
| `pnpm lint`                | ESLint                                                                                 |
| `pnpm type-check`          | TypeScript type check (`tsc --noEmit`)                                                 |
| `pnpm test`                | Vitest unit tests                                                                      |
| `pnpm test:watch`          | Vitest in watch mode                                                                   |
| `pnpm test:e2e`            | Playwright E2E (headless)                                                              |
| `pnpm test:e2e:ui`         | Playwright UI mode                                                                     |
| `pnpm test:e2e:headed`     | Playwright with visible browser                                                        |
| `pnpm test:all`            | Unit + E2E                                                                             |

> **First-time E2E setup**: install browser binaries before running any Playwright test:
>
> ```bash
> pnpm exec playwright install --with-deps chromium
> ```

### Template Markers

Template examples commonly include the `@template-example` JSDoc marker, but not every removable artifact has this tag.
Use cleanup commands as the source of truth when stripping template residue.

## Quality Gates

All must pass before merging:

```bash
pnpm lint          # ESLint — zero errors
pnpm type-check    # TypeScript — zero type errors
pnpm test          # Vitest — all tests green
pnpm build         # Next.js production build
```

Pre-commit hooks run lint-staged + type-check automatically on every commit. Commit messages are enforced with [Conventional Commits](https://www.conventionalcommits.org/).

## Authentication

Auth.js v5 is pre-configured with Google OAuth. Protected routes: `/dashboard`, `/profile`, `/settings`.

```ts
// Server component — get the current session
import { getSession, requireAuth } from "@/lib/auth";

const session = await getSession(); // returns session or null
const session = await requireAuth(); // throws if not authenticated
```

To add another provider, update `auth.ts` and add the corresponding env vars.

---

## GitHub Copilot Setup

This template ships with a full Copilot configuration out of the box.

### What's included

| Feature                                                                                           | Location                                 |
| ------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| Project-wide instructions                                                                         | `.github/copilot-instructions.md`        |
| Per-technology instruction files                                                                  | `.github/instructions/*.instructions.md` |
| Custom VS Code agents                                                                             | `.github/agents/*.agent.md`              |
| Reusable prompt files                                                                             | `.github/prompts/*.prompt.md`            |
| MCP servers (Context7, Playwright, Shadcn, Next Devtools, Markitdown, and 5 custom local servers) | `.vscode/mcp.json`                       |
| Skills library                                                                                    | `.agents/skills/`                        |
| Lifecycle hooks                                                                                   | `.github/hooks/`                         |

### MCP Servers

Configured in `.vscode/mcp.json`. Active servers:

| Server                 | What it enables                                                          |
| ---------------------- | ------------------------------------------------------------------------ |
| **Context7**           | Up-to-date docs for any npm library, injected into context automatically |
| **Playwright MCP**     | Browser automation and UI debugging directly from chat                   |
| **Shadcn MCP**         | Browse shadcn/ui registry items and generate add commands                |
| **Next Devtools MCP**  | Next.js-specific diagnostics and upgrades                                |
| **Markitdown MCP**     | Convert any document (PDF, Word, Excel, HTML, images) to Markdown        |
| **youtube-transcript** | Transcribe and analyze YouTube videos from chat                          |
| **npm-registry**       | Query npm package metadata and latest versions from chat                 |
| **hacker-news**        | Browse and search Hacker News from chat                                  |
| **osv-vulnerability**  | Scan project dependencies for known OSV security vulnerabilities         |
| **rss-feed**           | Read and summarize RSS/Atom feeds from chat                              |

### Custom Agents

Invoke from the VS Code agent panel or mention `@agent-name` in chat:

| Agent             | Purpose                                              |
| ----------------- | ---------------------------------------------------- |
| `Feature Builder` | Build new features following project conventions     |
| `Test Generator`  | Generate Vitest unit tests and Playwright E2E tests  |
| `Code Reviewer`   | Review code for quality, security, and accessibility |
| `Debug`           | Systematically find and fix bugs                     |
| `Architect`       | Design system architecture with Mermaid diagrams     |
| `Planner`         | Generate implementation plans (read-only)            |
| `ADR Generator`   | Create Architectural Decision Records                |
| `PRD Creator`     | Turn feature ideas into structured PRDs              |
| `GitHub Actions`  | Create secure CI/CD workflows                        |

### Reusable Prompts

Available via `@prompt` in chat or from the prompt file picker:

- `create-component` — scaffold a new Server/Client component
- `create-page` — create a new App Router page
- `create-api-route` — create a Route Handler with Zod validation
- `create-schema` — generate a Zod schema
- `create-store` — create a Zustand store
- `generate-tests` — generate tests for a given file
- `health-check` — run lint + typecheck + tests

---

## GitHub Copilot CLI

Run Copilot directly from your terminal without switching to the IDE.

### Installation

```bash
# Requires GitHub CLI
brew install gh
gh extension install github/gh-copilot
```

### Daily workflow

```bash
# Ask anything in natural language
gh copilot suggest "create a pnpm script to run only changed tests"

# Explain a complex command
gh copilot explain "pnpm type-check"
```

### Slash commands (inside chat)

| Command     | What it does                                  |
| ----------- | --------------------------------------------- |
| `/fix`      | Fix the error or failing test in context      |
| `/test`     | Generate tests for the current file           |
| `/explain`  | Explain what the selected code does           |
| `/doc`      | Generate JSDoc/TSDoc for the current function |
| `/simplify` | Refactor the selection to be more readable    |

### Agentic CLI — handoff with coding agent

You can move work between the cloud coding agent and your local terminal:

```bash
# Pull a cloud coding agent session into your terminal
# (copy the command from "Continue in Copilot CLI" in the Agents panel on GitHub)
gh copilot session resume <session-id>

# Push current work back to the cloud agent and keep going locally
# Press & inside the CLI session
```

---

## Copilot Coding Agent — WRAP

See [AGENTS.md](./AGENTS.md) for the full WRAP methodology and best practices for delegating tasks to the coding agent.

**Quick reference:**

1. **W**rite a clear, atomic GitHub issue with examples
2. **R**efine `.github/copilot-instructions.md` to encode your conventions
3. **A**tomic tasks — each issue → one reviewable PR
4. **P**air — you handle the why and cross-system thinking; the agent handles execution

Assign an issue to the coding agent by setting **Copilot** as the assignee, or from the Agents panel on github.com.

---

## AI Ecosystem

This template ships a fully-configured AI development environment for VS Code Copilot, Claude, and any MCP-compatible agent runtime.

### Specialist Agents (`.github/agents/`)

| Agent             | Purpose                                                                  |
| ----------------- | ------------------------------------------------------------------------ |
| `router`          | Default entry point — reads intent and delegates to the right specialist |
| `feature-builder` | End-to-end feature implementation                                        |
| `debug`           | Root-cause analysis and bug fixing                                       |
| `planner`         | Multi-file refactors, architectural decisions                            |
| `code-reviewer`   | High signal-to-noise PR reviews (bugs/security only)                     |
| `test-generator`  | Vitest + Playwright test authoring                                       |
| `architect`       | ADRs, system design, technology decisions                                |
| `adr-generator`   | Architecture Decision Records                                            |
| `github-actions`  | CI/CD workflows, GitHub Actions                                          |
| `prd-creator`     | Product requirements documents                                           |
| `ui-components`   | UI component scaffolding and design system patterns                      |

### Skills (`.agents/skills/` — 47 installed)

Skills extend agents with domain-specific knowledge. Notable skills:

- **`nextjs-app-router-patterns`** — Server Components, streaming, Cache Components
- **`aws-ecosystem`** — Infrastructure patterns (RDS, S3, Lambda, Bedrock)
- **`authjs-skills`** — Auth.js v5 setup with Google OAuth and credentials
- **`playwright-expert`** — E2E test infrastructure and debugging
- **`agent-governance`** — Safety and trust controls for AI agent systems
- **`agentic-eval`** — Evaluator-optimizer pipelines for quality-critical generation
- **`context-map`** — Generate relevance maps before making changes
- **`git-commit`** — Conventional commit message generation

Run `skills list` or check `.agents/skills/` for the full catalog.

### MCP Servers (`.vscode/mcp.json`)

| Server               | Purpose                                                                           |
| -------------------- | --------------------------------------------------------------------------------- |
| `context7`           | Authoritative, version-specific library documentation (Next.js, React, Zod, etc.) |
| `playwright`         | Browser automation and E2E test generation                                        |
| `shadcn`             | Component registry access                                                         |
| `markitdown`         | Convert documents (PDF, Word, Excel, HTML, images) to Markdown — requires `uv`    |
| `next-devtools`      | Next.js runtime diagnostics and documentation tooling                             |
| `youtube-transcript` | Extract transcript text from YouTube videos                                       |
| `npm-registry`       | Query npm metadata, versions, and package details                                 |
| `hacker-news`        | Search stories and discussions for release/risk intelligence                      |
| `osv-vulnerability`  | Query OSV/GHSA/CVE vulnerability data for dependencies                            |
| `rss-feed`           | Aggregate release/news feeds for stack monitoring                                 |

> Note: GitHub and memory capabilities can still be available through the Copilot runtime harness even when they are not declared in `.vscode/mcp.json`.

### Prompts (`.github/prompts/`)

30 reusable prompt files covering: component creation, API routes, Zod schemas, Zustand stores, forms, Playwright tests, security audits, Lighthouse audits, feature docs, skills, and more. Use via `@workspace` or the Copilot Chat prompt selector.

### Hooks (`.github/hooks/`)

- **`sessionStart`** — Injects Node.js version and git branch context at session start
- **`sessionEnd`** — Runs the full quality gate (`lint + type-check + test + build`) before the agent finishes

### Instruction Files (`.github/instructions/`)

18 domain-specific instruction files covering: Next.js, React, TypeScript, Tailwind, Auth, Security (OWASP), Accessibility (WCAG 2.2), Vitest, Playwright, Performance, Markdown, Context7, Clean Code, Feature Context, Code Review, i18n, MDX, and SonarQube MCP guidance. All are auto-discovered by VS Code Copilot via `applyTo` glob patterns.

---

## Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

See [Next.js deployment docs](https://nextjs.org/docs/app/building-your-application/deploying) for details.
