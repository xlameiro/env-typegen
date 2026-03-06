---
name: 'Health Check'
agent: 'agent'
description: 'Full session completion check: lint, typecheck, tests, and build'
tools: [vscode, execute, read, agent, edit, search, web, browser, 'io.github.upstash/context7/*', 'shadcn/*', 'playwright/*', 'next-devtools/*', 'github/*', vscode.mermaid-chat-features/renderMermaidDiagram, todo]
---

Run the full project health check to verify everything is in a releasable state.

Execute these commands in order and report the result of each:

```bash
pnpm lint
```

```bash
npx tsc --noEmit
```

```bash
pnpm test
```

```bash
pnpm build
```

## Expected outcomes

- `pnpm lint` — zero ESLint errors or warnings
- `npx tsc --noEmit` — zero TypeScript errors
- `pnpm test` — all Vitest tests pass (0 failures)
- `pnpm build` — Next.js production build succeeds with no errors

## If any command fails

1. Show the full error output
2. Identify the root cause
3. Fix the issue
4. Re-run the failing command to confirm the fix
5. Continue to the next command

Do NOT stop at the first failure — run all commands and fix all issues before finishing.

## Final report

Once all commands pass, provide a brief summary:
- ✅ Lint: passed
- ✅ TypeCheck: passed
- ✅ Tests: N tests passed
- ✅ Build: successful
