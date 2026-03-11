---
applyTo: "**/*.tsx, **/*.ts, **/*.jsx, **/*.js"
description: "Code quality principles for this codebase — what 'good code' looks like here. Tells the LLM how to write maintainable, decoupled, readable code beyond structural conventions."
---

# Clean Code — Quality Principles

These rules answer **why** code is written a certain way in this codebase and how to evaluate whether a change is an improvement. They complement `.github/copilot-instructions.md` (structural rules) — they do not override it.

---

## Functions

- **One function, one job** — the name must fully describe the function's purpose without an "and" or "or". If you need "and", split the function.
- **Name reveals intent** — prefer `getUsersByActiveStatus()` over `getUsers(true)`. Callers should never need to read the body to understand what the function does.
- **Data in, data out** — pure functions are preferred. When a function must produce a side effect, return the result so callers can compose without a second read.
- **No hidden control flow** — functions must not silently redirect, mutate global state, or throw unless documented. Side effects belong at the call site.
- **Limit to 2–3 parameters** — if more are needed, accept a single options object. Bare positional arguments beyond 2 are hard to read at the call site.
- **Guard clauses first** — put the early-return check at the top. Nest only the happy path. Nesting deeper than 2 levels is a signal to extract.

```ts
// ❌ Bad: name hides intent, nested logic
function process(data: unknown, flag: boolean) {
  if (flag) {
    if (data) {
      /* ... */
    }
  }
}

// ✅ Good: name reveals intent, flat structure
function formatActiveUserLabel(user: User): string {
  if (!user.isActive) return "";
  return `${user.name} (active)`;
}
```

---

## Components

- **No boolean prop explosion** — if a component has more than 2–3 boolean flags that change its look or behavior, use CVA variants instead. Boolean props are a sign of a component that should be split.
- **No prop-drilling past 2 levels** — if a value must travel through 2+ component layers without being used in between, lift it to React Context or a Zustand store.
- **Props as a contract** — every prop must have a use in the component body. Remove unused props immediately — they mislead readers.
- **Data fetching stays at the boundary** — Server Components fetch; UI components render. Never put `fetch()` or Zustand selectors inside a pure display component.
- **No `useEffect` for derived state** — if a value can be computed from props or other state, compute it inline or with `useMemo`. Reserve `useEffect` for genuinely external sync (browser APIs, third-party subscriptions).
- **Event handlers are functions, not inline expressions** — define handlers as named functions prefixed with `handle`. Inline arrow expressions in JSX make profiling and testing harder.

```tsx
// ❌ Bad: inline handler, boolean prop explosion
<Button
  primary
  disabled={!isValid}
  loading={isPending}
  onClick={() => setOpen(true)}
/>;

// ✅ Good: named handler, CVA variant, single semantic prop
function handleOpenClick() {
  setOpen(true);
}
<Button variant="primary" isDisabled={!isValid} onClick={handleOpenClick} />;
```

---

## State Management

- **Local state by default** — start with `useState`. Only promote to context or Zustand when the state is needed in 2+ unrelated components.
- **Derived state is not state** — never mirror server data into `useState` that could be computed on render. Synchronizing state is a bug surface.
- **Mutations return confirmation, not void** — every Server Action must return a typed `Result<T, AppError>`. Callers must handle both branches. `void` return from a server mutation is always wrong.
- **URL as state** — data that should survive a page refresh or be shareable belongs in the URL. Use `nuqs` for typed URL search params instead of `useState`.

---

## Modules and Files

- **Cohesion over convenience** — group code by feature, not by type. `app/profile/actions.ts` is better than `lib/actions/profile.ts` when the actions are only used by the profile feature.
- **No barrel re-exports** — import directly from the source file. Barrels (`index.ts`) prevent tree-shaking and create circular dependency traps.
- **`server-only` at the top of every server module** — any file in `lib/` that calls `auth()`, reads from a database, or handles secrets must have `import 'server-only'` as its first line.
- **No cross-feature internal imports** — if feature A needs something from feature B, that thing belongs in `lib/` (shared) or the dependency direction should be reversed.
- **Co-locate tests** — the test file lives next to the file it tests (`foo.ts` → `foo.test.ts`), not in a separate `__tests__` folder.

---

## Error Handling

- **Typed errors, not strings** — throw instances of typed error classes from `lib/errors.ts`. Generic `Error("something went wrong")` is banned — it tells the developer nothing.
- **Errors at the boundary, not the interior** — validate and throw at the outermost entry point (Route Handler, Server Action). Inner functions receive already-validated data and should not re-validate.
- **Server Actions return `Result<T, AppError>`** — never `throw` from a Server Action. Throw causes a generic error boundary activation; a typed result lets the form surface a specific message.
- **Error messages are actionable** — each error message must answer: (1) what happened, (2) why it matters, (3) how to fix it.

```ts
// ❌ Bad: opaque, uncatchable in forms
export async function updateProfile(data: unknown) {
  if (!data) throw new Error("invalid");
  await db.update(data);
}

// ✅ Good: typed result, actionable message
export async function updateProfile(
  data: unknown,
): Promise<Result<User, AppError>> {
  const parsed = UpdateProfileSchema.safeParse(data);
  if (!parsed.success) {
    return {
      ok: false,
      error: new ValidationError(
        "Profile update failed — invalid fields",
        parsed.error,
      ),
    };
  }
  const user = await db.update(parsed.data);
  return { ok: true, data: user };
}
```

---

## Naming

- **No abbreviations** — write `user`, not `u`; `fieldMetadata`, not `fm`; `event`, not `e`. Exception: loop indices (`i`, `j`) in trivial `for` loops.
- **Boolean prefix** — every boolean variable or prop starts with `is`, `has`, `can`, or `should`. Unprefixed booleans like `active`, `loading`, `open` are ambiguous.
- **Consistent verb tenses** — functions that return values use descriptive nouns (`getUserCount`, `formatDate`). Functions that produce side effects use imperative verbs (`deleteUser`, `triggerNotification`).
- **Constants in SCREAMING_SNAKE_CASE** — only for top-level module constants (`MAX_RETRY_COUNT`). Object keys remain camelCase.
- **No generic names** — `data`, `result`, `value`, `info`, `item` are banned unless the type is explicitly narrowed nearby. Use the domain term: `user`, `invoice`, `searchResult`.

---

## Comments

- **Write _why_, never _what_** — a comment that restates the code is noise. A comment that explains a constraint, trade-off, or non-obvious decision is signal.
- **Never delete historical decision comments** — if a comment explains why an approach was chosen over an obvious alternative, keep it. Update if the surrounding code changes.
- **TODO format** — `// TODO(username): short description — tracking link`. Undated, unattributed TODOs are not allowed.
- **No commented-out code** — delete it. Git history preserves it.

---

## Code Review / Self-Review Checklist

Apply this before opening a PR:

- [ ] Every new function has a name that reveals its intent without reading the body
- [ ] No function has more than 3 parameters (beyond 2, use an options object)
- [ ] No prop-drilling past 2 levels (use context or store)
- [ ] No `useEffect` where a computed value would do
- [ ] Every Server Action returns a typed `Result<T, AppError>`, not `void` or a thrown error
- [ ] No `any`, no `!` non-null assertion, no `@ts-ignore`
- [ ] No commented-out code committed
- [ ] Error messages answer: what happened / why / how to fix

## Learnings
