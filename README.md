# Next.js 16 Starter Template

A production-ready Next.js 16 starter with TypeScript 5 strict, React 19, Tailwind CSS v4, Auth.js v5, Zod, Vitest, Playwright, and a full GitHub Copilot AI setup.

## Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 16.1.6 (App Router) |
| Runtime | React 19 |
| Language | TypeScript 5 strict mode |
| Styling | Tailwind CSS v4 |
| Auth | Auth.js v5 |
| Validation | Zod |
| State | Zustand (client only) |
| Unit tests | Vitest |
| E2E tests | Playwright |
| Package manager | pnpm |

## Getting Started

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Quality Gates

All must pass before merging:

```bash
pnpm lint          # ESLint — zero errors
npx tsc --noEmit   # TypeScript — zero type errors
pnpm test          # Vitest — all tests green
pnpm build         # Next.js production build
```

---

## GitHub Copilot Setup

This template ships with a full Copilot configuration out of the box.

### What's included

| Feature | Location |
|---------|----------|
| Project-wide instructions | `.github/copilot-instructions.md` |
| Per-technology instruction files | `.github/instructions/*.instructions.md` |
| Custom VS Code agents | `.github/agents/*.agent.md` |
| Reusable prompt files | `.github/prompts/*.prompt.md` |
| MCP servers (Context7, Playwright, Shadcn, Next Devtools, GitHub) | `.vscode/mcp.json` |
| Skills library | `.agents/skills/` |
| Lifecycle hooks | `.github/hooks/` |

### MCP Servers

Configured in `.vscode/mcp.json`. Active servers:

| Server | What it enables |
|--------|----------------|
| **Context7** | Up-to-date docs for any npm library, injected into context automatically |
| **Playwright MCP** | Browser automation and UI debugging directly from chat |
| **Shadcn MCP** | Add and configure shadcn/ui components |
| **Next Devtools MCP** | Next.js-specific diagnostics and upgrades |
| **GitHub MCP** | Create issues, PRs, branches, and read repo data from chat |

### Custom Agents

Invoke from the VS Code agent panel or mention `@agent-name` in chat:

| Agent | Purpose |
|-------|---------|
| `Feature Builder` | Build new features following project conventions |
| `Test Generator` | Generate Vitest unit tests and Playwright E2E tests |
| `Code Reviewer` | Review code for quality, security, and accessibility |
| `Debug` | Systematically find and fix bugs |
| `Architect` | Design system architecture with Mermaid diagrams |
| `Planner` | Generate implementation plans (read-only) |
| `ADR Generator` | Create Architectural Decision Records |
| `PRD Creator` | Turn feature ideas into structured PRDs |
| `GitHub Actions` | Create secure CI/CD workflows |

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
gh copilot explain "npx tsc --noEmit --incremental false"
```

### Slash commands (inside chat)

| Command | What it does |
|---------|--------------|
| `/fix` | Fix the error or failing test in context |
| `/test` | Generate tests for the current file |
| `/explain` | Explain what the selected code does |
| `/doc` | Generate JSDoc/TSDoc for the current function |
| `/simplify` | Refactor the selection to be more readable |

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

## Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

See [Next.js deployment docs](https://nextjs.org/docs/app/building-your-application/deploying) for details.
