"use client";

import { cn } from "@/lib/utils";
import type { InputHTMLAttributes, ReactNode } from "react";
import type { FieldError } from "react-hook-form";

// ──────────────────────────────────────────
// FormField — wraps label + input + error
// ──────────────────────────────────────────

type FormFieldProps = Readonly<{
  label: string;
  htmlFor: string;
  error?: FieldError;
  required?: boolean;
  children: ReactNode;
}>;

export function FormField({
  label,
  htmlFor,
  error,
  required,
  children,
}: FormFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium text-foreground">
        {label}
        {required && (
          <span aria-hidden="true" className="ml-1 text-destructive">
            *
          </span>
        )}
      </label>
      {children}
      {error && <FormError id={`${htmlFor}-error`} message={error.message} />}
    </div>
  );
}

// ──────────────────────────────────────────
// FormInput — accessible input with error state
// ──────────────────────────────────────────

type FormInputProps = InputHTMLAttributes<HTMLInputElement> &
  Readonly<{
    hasError?: boolean;
    errorId?: string;
  }>;

export function FormInput({
  hasError,
  errorId,
  className,
  ...props
}: FormInputProps) {
  return (
    <input
      aria-invalid={hasError ? true : undefined}
      aria-describedby={hasError && errorId ? errorId : undefined}
      className={cn(
        "h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground",
        "placeholder:text-muted-foreground",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        "disabled:cursor-not-allowed disabled:opacity-50",
        hasError && "border-destructive focus-visible:outline-destructive",
        className,
      )}
      {...props}
    />
  );
}

// ──────────────────────────────────────────
// FormError — inline validation message
// ──────────────────────────────────────────

type FormErrorProps = Readonly<{
  id?: string;
  message?: string;
}>;

export function FormError({ id, message }: FormErrorProps) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="text-xs text-destructive">
      {message}
    </p>
  );
}

// ──────────────────────────────────────────
// FormMessage — success or info feedback
// ──────────────────────────────────────────

type FormMessageProps = Readonly<{
  type?: "success" | "error" | "info";
  message?: string;
}>;

export function FormMessage({ type = "info", message }: FormMessageProps) {
  if (!message) return null;

  const styles = {
    success:
      "bg-green-50 text-green-800 border-green-200 dark:bg-green-950 dark:text-green-200 dark:border-green-800",
    error: "bg-destructive/10 text-destructive border-destructive/20",
    info: "bg-accent text-accent-foreground border-border",
  };

  if (type === "error") {
    return (
      <div
        role="alert"
        aria-live="assertive"
        className={cn("rounded-md border px-4 py-3 text-sm", styles[type])}
      >
        {message}
      </div>
    );
  }

  // <output> has implicit role="status" — semantically correct for live regions
  return (
    <output className={cn("rounded-md border px-4 py-3 text-sm", styles[type])}>
      {message}
    </output>
  );
}
