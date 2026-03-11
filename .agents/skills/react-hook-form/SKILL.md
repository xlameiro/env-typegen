---
name: react-hook-form
description: Form validation and state management with react-hook-form and Zod resolvers. Use when writing forms in this project. Covers RHF + Zod resolver pattern, useActionState with Server Actions, and the project-owned form primitives in components/ui/form.tsx. Do NOT use Formik or manual useState forms.
---

# react-hook-form Skill

Use this skill when writing forms in this project. This is the only approved form library — do NOT use Formik or uncontrolled `<form>` with manual `useState`.

## Stack

- `react-hook-form` — form state and validation orchestration
- `@hookform/resolvers` — bridges RHF with Zod schemas
- Zod v4 schemas from `lib/schemas/` (always `import 'server-only'` there)
- `useActionState` from React 19 — connects to Server Actions
- `components/ui/form.tsx` — project-owned form primitives: `FormField`, `FormInput`, `FormError`, `FormMessage`

## Pattern 1 — Basic RHF + Zod resolver

```tsx
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.email("Invalid email"),
});

type FormValues = z.infer<typeof schema>;

export function MyForm() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  function onSubmit(data: FormValues) {
    console.log(data);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <FormField label="Name" htmlFor="name" error={errors.name} required>
        <FormInput
          id="name"
          hasError={Boolean(errors.name)}
          {...register("name")}
        />
      </FormField>
      <button type="submit">Submit</button>
    </form>
  );
}
```

## Pattern 2 — RHF + Server Action (React 19 `useActionState`)

```tsx
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useActionState } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { mySchema } from "@/lib/schemas/my.schema";
import { myAction } from "./actions";

type FormValues = z.infer<typeof mySchema>;

const initialState = { success: false, message: "" };

export function MyActionForm() {
  const [state, formAction, isPending] = useActionState(myAction, initialState);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(mySchema),
  });

  // RHF validates client-side first; only on success it calls the Server Action
  function handleFormSubmit(data: FormValues) {
    formAction(data);
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} noValidate>
      {/* fields */}
      {state.message && (
        <FormMessage
          type={state.success ? "success" : "error"}
          message={state.message}
        />
      )}
      <button type="submit" disabled={isPending} aria-busy={isPending}>
        {isPending ? "Saving…" : "Submit"}
      </button>
    </form>
  );
}
```

## Pattern 3 — Server Action definition

```ts
"use server";

import { mySchema } from "@/lib/schemas/my.schema";
import type { z } from "zod";

type Input = z.infer<typeof mySchema>;
type Result = { success: boolean; message: string };

export async function myAction(
  _prevState: Result,
  data: Input,
): Promise<Result> {
  const parsed = mySchema.safeParse(data);
  if (!parsed.success) return { success: false, message: "Invalid input." };

  // persist parsed.data
  return { success: true, message: "Saved successfully." };
}
```

## Pattern 4 — Error display rules

- Use `FormField` wrapper from `components/ui/form.tsx` — it renders `<label>`, the input slot, and `FormError` automatically
- Always pass `error={errors.fieldName}` to `FormField`
- Always pass `hasError={Boolean(errors.fieldName)}` + `errorId="fieldName-error"` to `FormInput` — sets `aria-invalid` and `aria-describedby`
- Display server-level feedback with `<FormMessage type="success|error" message={...} />`
- Focus the first invalid field on failed submit using `setFocus("fieldName")` from `useForm`

## Pattern 5 — Multi-step forms

```tsx
const [step, setStep] = useState<"personal" | "account">("personal");

// Use `trigger(["name", "email"])` to validate only the current step's fields
const isValid = await trigger(["name", "email"]);
if (isValid) setStep("account");
```

- Always mark schemas in `lib/schemas/` with `import 'server-only'` — they must never run in Client Components

## Rules

- Never use `interface` for form types — always `type FormValues = z.infer<typeof schema>`
- Never use `useEffect` to react to form state — use `watch()` or `useWatch()` from RHF instead
- Validation happens twice by design: client-side (RHF + Zod) for UX speed, server-side (Server Action + Zod) for security
- Use `noValidate` on `<form>` to disable browser native validation — RHF owns this
- See `app/profile/profile-form.tsx` for the canonical working example in this project

## When NOT to use RHF

- Single-field forms (e.g., newsletter subscribe) — a plain `<form>` with a Server Action is simpler
- Read-only forms — not a form at all, just a data display
