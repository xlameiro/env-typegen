---
title: Prefer zod/mini in Client Components — the Default for Bundle-Sensitive Code
impact: HIGH
impactDescription: Full Zod is ~17kb gzipped; Zod Mini is ~1.9kb — 85% smaller. Every form schema shipped to a Client Component goes to every browser user.
tags: perf, bundle, mini, tree-shaking
---

## Prefer `zod/mini` in Client Components

**Project convention:** import from `"zod/mini"` in any file that runs in the browser
(`"use client"` components, form schemas imported by Client Components, edge functions
with size limits). Import from `"zod"` on the server (Server Components, Server Actions,
Route Handlers, API boundaries where bundle size is irrelevant).

> **v4 note:** `zod/mini` is a **sub-path export of the `zod` package** since v4. The old
> `@zod/mini` package was Zod v3 only and no longer exists.

```typescript
// ✅ In Client Components / form schemas used client-side
import { z } from "zod/mini";

// ✅ In Server Components, Server Actions, Route Handlers, lib/
import { z } from "zod";
```

---

### Zod Mini API — Key Differences from Regular Zod

Zod Mini replaces **method-chain validators** with a `.check()` method that accepts
validator functions as arguments. Object transformation helpers become standalone
functions. Parsing is identical.

#### Validators — use `.check()` instead of chained methods

```typescript
import { z } from "zod/mini";

// ❌ Regular Zod style (method chaining) — does NOT work in zod/mini
// z.string().min(1).max(100).email()  ← .min/.max/.email don't exist as methods

// ✅ Zod Mini style — pass validator functions to .check()
const nameSchema = z.string().check(z.minLength(1), z.maxLength(100));
const emailSchema = z.string().check(z.email());
const ageSchema = z.number().check(z.int(), z.positive());
const scoreSchema = z.number().check(z.minimum(0), z.maximum(100));
```

#### Wrapper helpers — use functions instead of methods

```typescript
import { z } from "zod/mini";

// ❌ Regular Zod methods on schema
// z.string().optional()
// z.string().nullable()
// z.string().array()

// ✅ Zod Mini functional wrappers
const opt = z.optional(z.string()); // string | undefined
const nul = z.nullable(z.string()); // string | null
const arr = z.array(z.string()); // string[]
```

#### Object helpers — functions instead of methods

```typescript
import { z } from "zod/mini";

const baseSchema = z.object({
  id: z.string().check(z.uuid()),
  name: z.string().check(z.minLength(1)),
});

// z.extend — add fields (replaces .extend())
const withTimestamps = z.extend(baseSchema, {
  createdAt: z.string().check(z.iso.datetime()),
});

// z.partial — make all fields optional (replaces .partial())
const updateSchema = z.partial(baseSchema);

// z.pick / z.omit (replace .pick() / .omit())
const publicSchema = z.pick(baseSchema, { name: true });
const privateSchema = z.omit(baseSchema, { id: true });
```

#### Parsing — identical to regular Zod

```typescript
import { z } from "zod/mini";

const schema = z.object({ name: z.string(), age: z.number() });

// ✅ Method-based parsing — same API as regular Zod
const parsed = schema.parse({ name: "Alice", age: 30 });
const result = schema.safeParse({ name: "Bob" }); // .success / .error

// ✅ Functional alternatives (also available in zod/mini)
const parsed2 = z.parse(schema, { name: "Alice", age: 30 });
const result2 = z.safeParse(schema, { name: "Bob" });
```

#### Multi-stage transforms — use `z.pipe()`

```typescript
import { z } from "zod/mini";

// z.pipe() chains schemas where the output of one feeds into another type
const stringToNumber = z.pipe(
  z.string(),
  z.transform(Number),
  z.number().check(z.positive()),
);

stringToNumber.parse("42"); // => 42
```

---

### Full Example — Login Form Schema (Client Component)

```typescript
// app/auth/sign-in/sign-in-schema.ts
// This file is imported by a "use client" form — use zod/mini
import { z } from "zod/mini";

export const signInSchema = z.object({
  email: z.string().check(z.email()),
  password: z.string().check(z.minLength(8)),
  rememberMe: z.optional(z.boolean()),
});

export type SignInInput = z.infer<typeof signInSchema>;
```

Compare with the Server Action (server-side boundary):

```typescript
// app/auth/sign-in/actions.ts
"use server";
// Server-side — bundle size irrelevant, use full Zod for ergonomics
import { z } from "zod";

const signInActionSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});
```

---

### Bundle Size Comparison

| Import          | Gzipped Size | Where to use                                              |
| --------------- | ------------ | --------------------------------------------------------- |
| `zod` (v4)      | ~17 kb       | Server Components, Server Actions, Route Handlers, `lib/` |
| `zod/mini` (v4) | ~1.9 kb      | `"use client"` files, form schemas, edge runtime          |

**Decision rule:** if the file contains or is transitively imported by a `"use client"` directive, use `zod/mini`.

---

### API Quick Reference

| Operation           | Regular Zod (`zod`)            | Zod Mini (`zod/mini`)                                |
| ------------------- | ------------------------------ | ---------------------------------------------------- |
| String min/max      | `z.string().min(1).max(100)`   | `z.string().check(z.minLength(1), z.maxLength(100))` |
| Email               | `z.string().email()`           | `z.string().check(z.email())`                        |
| Optional            | `z.string().optional()`        | `z.optional(z.string())`                             |
| Nullable            | `z.string().nullable()`        | `z.nullable(z.string())`                             |
| Array               | `z.array(z.string())`          | `z.array(z.string())` (same)                         |
| Extended object     | `schema.extend({ ... })`       | `z.extend(schema, { ... })`                          |
| Partial object      | `schema.partial()`             | `z.partial(schema)`                                  |
| Pick fields         | `schema.pick({ field: true })` | `z.pick(schema, { field: true })`                    |
| Parse (method)      | `schema.parse(data)`           | `schema.parse(data)` (same)                          |
| Safe parse (method) | `schema.safeParse(data)`       | `schema.safeParse(data)` (same)                      |
| Parse (functional)  | `z.parse(schema, data)`        | `z.parse(schema, data)` (same)                       |
| Multi-stage         | `z.string().transform(Number)` | `z.pipe(z.string(), z.transform(Number))`            |

Reference: [Zod Mini](https://zod.dev/packages/mini)
