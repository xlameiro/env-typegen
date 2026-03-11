---
description: "Guidelines for writing Node.js and JavaScript code with Vitest testing"
applyTo: "**/*.js, **/*.mjs, **/*.cjs, **/*.ts, **/*.tsx"
---

# Code Generation Guidelines

## Coding standards

- Use JavaScript with ES2022 features and Node.js (20+) ESM modules
- Use Node.js built-in modules and avoid external dependencies where possible
- Ask the user if you require any additional dependencies before adding them
- Always use async/await for asynchronous code; avoid callbacks. `node:util` `promisify` is available as a last resort for legacy callback-style APIs, but Node.js 20+ provides native async/await equivalents for most built-in modules \u2014 prefer those for new code.
- Keep the code simple and maintainable
- Use descriptive variable and function names
- Do not add comments unless absolutely necessary, the code should be self-explanatory
- Never use `null`, always use `undefined` for optional values
- Prefer functions over classes

## Testing

- This project uses **Vitest v4.x** (currently v4.0.18 stable; v4.1 is in beta). Vitest v4 is a major version bump from v3 — if upgrading an existing project review the [Vitest v4 migration guide](https://vitest.dev/guide/migration) before updating. The experimental `onModuleRunner` hook in `worker.init` is available in v4 but should not be used in test configs without evaluation.
  - **Upcoming in Vitest v4.1** (beta as of 2026-03): `vi.mockThrow()` / `vi.mockThrowOnce()` for concisely testing error-throwing code; `aroundEach()` / `aroundAll()` lifecycle hooks for cleaner async setup/teardown; `test.extend()` with proper type inference for fixture-based tests. These APIs stabilize when v4.1 ships.
- Use Vitest for testing
- Write tests for all new features and bug fixes
- Ensure tests cover edge cases and error handling
- NEVER change the original code to make it easier to test, instead, write tests that cover the original code as it is

## Documentation

- When adding new features or making significant changes, update the README.md file where necessary

## User interactions

- Ask questions if you are unsure about the implementation details, design choices, or need clarification on the requirements
- Always answer in the same language as the question, but use english for the generated content like code, comments or docs

## Learnings
