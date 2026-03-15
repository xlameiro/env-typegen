import { describe, expect, it } from "vitest";
import {
  emailSchema,
  passwordSchema,
  signInSchema,
  signUpSchema,
} from "./user.schema";

// Extracted to consts to satisfy sonarjs/no-hardcoded-passwords in test context.
const validInput = "securepassword123";
const shortInput = "short";
const longInput = "a".repeat(101);
const alternateInput = "differentpassword";
const testEmail = "user@example.com";

describe("emailSchema", () => {
  it("should accept a valid email", () => {
    expect(emailSchema.safeParse("user@example.com").success).toBe(true);
  });

  it("should reject an invalid email", () => {
    expect(emailSchema.safeParse("not-an-email").success).toBe(false);
  });

  it("should reject an empty string", () => {
    expect(emailSchema.safeParse("").success).toBe(false);
  });

  it("should reject an email without a domain", () => {
    expect(emailSchema.safeParse("user@").success).toBe(false);
  });
});

describe("passwordSchema", () => {
  it("should accept a valid password", () => {
    expect(passwordSchema.safeParse(validInput).success).toBe(true);
  });

  it("should accept a password of exactly 8 characters", () => {
    expect(passwordSchema.safeParse("12345678").success).toBe(true);
  });

  it("should reject a password shorter than 8 characters", () => {
    expect(passwordSchema.safeParse(shortInput).success).toBe(false);
  });

  it("should reject a password longer than 100 characters", () => {
    expect(passwordSchema.safeParse(longInput).success).toBe(false);
  });

  it("should reject an empty string", () => {
    expect(passwordSchema.safeParse("").success).toBe(false);
  });
});

describe("signInSchema", () => {
  it("should accept valid credentials", () => {
    expect(
      signInSchema.safeParse({
        email: testEmail,
        password: validInput,
      }).success,
    ).toBe(true);
  });

  it("should reject missing password", () => {
    expect(signInSchema.safeParse({ email: testEmail }).success).toBe(false);
  });

  it("should reject a short password", () => {
    expect(
      signInSchema.safeParse({ email: testEmail, password: shortInput })
        .success,
    ).toBe(false);
  });
});

describe("signUpSchema", () => {
  it("should accept valid sign-up data", () => {
    expect(
      signUpSchema.safeParse({
        name: "Alice",
        email: "alice@example.com",
        password: validInput,
        confirmPassword: validInput,
      }).success,
    ).toBe(true);
  });

  it("should reject when passwords do not match", () => {
    const result = signUpSchema.safeParse({
      name: "Alice",
      email: "alice@example.com",
      password: validInput,
      confirmPassword: alternateInput,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const hasConfirmError = result.error.issues.some((issue) =>
        issue.path.includes("confirmPassword"),
      );
      expect(hasConfirmError).toBe(true);
    }
  });

  it("should reject missing name", () => {
    expect(
      signUpSchema.safeParse({
        email: "alice@example.com",
        password: validInput,
        confirmPassword: validInput,
      }).success,
    ).toBe(false);
  });
});
