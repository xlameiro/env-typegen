"use client";

import { Button } from "@/components/ui/button";
import { FormField, FormInput, FormMessage } from "@/components/ui/form";
import { updateUserSchema } from "@/lib/schemas/user.schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useActionState } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { updateProfileAction } from "./actions";

type ProfileFormValues = z.infer<typeof updateUserSchema>;

type ProfileFormProps = Readonly<{
  defaultValues: Partial<ProfileFormValues>;
}>;

const initialState = { success: false, message: "" };

export function ProfileForm({ defaultValues }: ProfileFormProps) {
  const [actionState, formAction, isPending] = useActionState(
    updateProfileAction,
    initialState,
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(updateUserSchema),
    defaultValues,
  });

  // Bridge RHF validation → Server Action: RHF validates client-side first,
  // then dispatches the validated data to the Server Action via formAction.
  function handleFormSubmit(data: ProfileFormValues) {
    formAction({ name: data.name, email: data.email });
  }

  return (
    <form
      // eslint rule no-misused-promises fires on RHF's handleSubmit because it returns Promise<void>.
      // Wrapping with void satisfies the attribute's void return expectation.
      onSubmit={(event) => {
        void handleSubmit(handleFormSubmit)(event);
      }}
      noValidate
      className="space-y-6 rounded-lg border border-border bg-background p-6"
    >
      <FormField label="Name" htmlFor="name" error={errors.name} required>
        <FormInput
          id="name"
          type="text"
          autoComplete="name"
          required
          hasError={Boolean(errors.name)}
          errorId="name-error"
          {...register("name")}
        />
      </FormField>

      <FormField label="Email" htmlFor="email" error={errors.email} required>
        <FormInput
          id="email"
          type="email"
          autoComplete="email"
          required
          hasError={Boolean(errors.email)}
          errorId="email-error"
          {...register("email")}
        />
      </FormField>

      {actionState.message && (
        <FormMessage
          type={actionState.success ? "success" : "error"}
          message={actionState.message}
        />
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={isPending} aria-busy={isPending}>
          {
            /* v8 ignore next -- useActionState's isPending is untestable in jsdom (React 19 limitation) */
            isPending ? "Saving…" : "Save changes"
          }
        </Button>
      </div>
    </form>
  );
}
