import { z } from "zod";

// ──────────────────────────────────────────
// Primitive schemas
// ──────────────────────────────────────────

export const emailSchema = z
  .email("Invalid email address")
  .describe("The user's email address — used as the primary identifier");

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(100, "Password must be at most 100 characters")
  .describe(
    "A plaintext password (min 8, max 100 chars) — hashed before storage",
  );

// ──────────────────────────────────────────
// User schemas
// ──────────────────────────────────────────

export const userSchema = z
  .object({
    id: z.string().min(1).describe("Unique user identifier"),
    name: z
      .string()
      .min(1, "Name is required")
      .max(100)
      .describe("User's full display name"),
    email: emailSchema,
    image: z
      .url()
      .nullable()
      .optional()
      .describe("URL of the user's avatar image; null when not set"),
    createdAt: z.coerce
      .date()
      .describe("Timestamp when the account was created"),
    updatedAt: z.coerce.date().describe("Timestamp of the last account update"),
  })
  .describe("A full user record as stored in the database");

export const createUserSchema = userSchema
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  })
  .describe("Fields required to create a new user account");

export const updateUserSchema = createUserSchema
  .partial()
  .describe(
    "Fields that can be updated on an existing user account; all are optional",
  );

// ──────────────────────────────────────────
// Auth schemas
// ──────────────────────────────────────────

export const signInSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
  })
  .describe("Credentials submitted on the sign-in form");

export const signUpSchema = z
  .object({
    name: z
      .string()
      .min(1, "Name is required")
      .max(100)
      .describe("User's full display name"),
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: passwordSchema.describe(
      "Must match the password field — validated client-side and server-side",
    ),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })
  .describe("Fields submitted on the sign-up registration form");

// ──────────────────────────────────────────
// Inferred types
// ──────────────────────────────────────────

export type User = z.infer<typeof userSchema>;
export type CreateUser = z.infer<typeof createUserSchema>;
export type UpdateUser = z.infer<typeof updateUserSchema>;
export type SignIn = z.infer<typeof signInSchema>;
export type SignUp = z.infer<typeof signUpSchema>;
