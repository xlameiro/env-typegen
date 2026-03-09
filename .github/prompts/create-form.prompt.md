---
agent: agent
description: Generate a type-safe form using react-hook-form + Zod + Server Actions. Invoke with /create-form.
---

# Create Form

Generate a complete, production-ready form following project conventions.

## Instructions

You are generating a form for a Next.js 16 App Router project. Follow these rules without exception:

1. **Stack**: `react-hook-form` + `@hookform/resolvers/zod` + Zod v4 schema + `useActionState` (React 19)
2. **No `interface`**: Use `type FormValues = z.infer<typeof schema>` — never `interface`
3. **Server Action**: Always co-locate in `actions.ts` with `"use server"` directive
4. **UI primitives**: Use `FormField`, `FormInput`, `FormError`, `FormMessage` from `@/components/ui/form`
5. **Accessibility**: `noValidate` on `<form>`, `aria-invalid`, `aria-describedby`, `aria-busy` on submit button
6. **No `useEffect`**: Never use `useEffect` to react to form state — use `watch()` or `useWatch()`

## Required files

For a form at `app/{feature}/page.tsx`, generate:

| File                              | Purpose                                      |
| --------------------------------- | -------------------------------------------- |
| `app/{feature}/{Feature}Form.tsx` | Client Component — RHF form                  |
| `app/{feature}/actions.ts`        | Server Action — Zod validation + persistence |

If a schema doesn't exist yet, also generate:

| File                              | Purpose                                                                   |
| --------------------------------- | ------------------------------------------------------------------------- |
| `lib/schemas/{feature}.schema.ts` | Zod v4 schema with `import 'server-only'` and `.describe()` on all fields |

## Output format

### 1. Schema (`lib/schemas/{feature}.schema.ts`)

```ts
import "server-only";
import { z } from "zod";

export const {feature}Schema = z.object({
  // Add fields here with .describe() for LLM context
}).describe("{description}");

export type {Feature} = z.infer<typeof {feature}Schema>;
```

### 2. Server Action (`app/{feature}/actions.ts`)

```ts
"use server";

import { {feature}Schema } from "@/lib/schemas/{feature}.schema";
import type { z } from "zod";

type Input = z.infer<typeof {feature}Schema>;
type Result = { success: boolean; message: string };

export async function {action}Action(_prevState: Result, data: Input): Promise<Result> {
  const parsed = {feature}Schema.safeParse(data);
  if (!parsed.success) return { success: false, message: "Invalid input." };
  // TODO: persist parsed.data
  return { success: true, message: "Saved successfully." };
}
```

### 3. Form Component (`app/{feature}/{Feature}Form.tsx`)

```tsx
"use client";

import { Button } from "@/components/ui/button";
import { FormError, FormField, FormInput, FormMessage } from "@/components/ui/form";
import { {feature}Schema } from "@/lib/schemas/{feature}.schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useActionState } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { {action}Action } from "./actions";

type FormValues = z.infer<typeof {feature}Schema>;

const initialState = { success: false, message: "" };

export function {Feature}Form({ defaultValues }: Readonly<{ defaultValues?: Partial<FormValues> }>) {
  const [state, formAction, isPending] = useActionState({action}Action, initialState);

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver({feature}Schema),
    defaultValues,
  });

  function handleFormSubmit(data: FormValues) {
    formAction(data);
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} noValidate className="space-y-6">
      {/* Add FormField components for each field */}

      {state.message && (
        <FormMessage type={state.success ? "success" : "error"} message={state.message} />
      )}

      <Button type="submit" disabled={isPending} aria-busy={isPending}>
        {isPending ? "Saving…" : "Submit"}
      </Button>
    </form>
  );
}
```

## Reference implementation

See `app/profile/profile-form.tsx` for a working end-to-end example.

## When to use this prompt

- Any time a user needs a form (create, edit, contact, search with submit)
- Updating existing forms to use RHF (migrating from uncontrolled forms)
- Multi-step forms — ask the user how many steps before generating
