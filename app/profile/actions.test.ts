import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  requireAuth: vi.fn().mockResolvedValue({
    user: { id: "u1", name: "Alice", email: "alice@test.com" },
  }),
}));

import { updateProfileAction } from "./actions";

const initialState = { success: false, message: "" };

describe("updateProfileAction", () => {
  it("should return success when input is valid", async () => {
    const result = await updateProfileAction(initialState, {
      name: "Alice Smith",
      email: "alice@example.com",
    });

    expect(result.success).toBe(true);
    expect(result.message).toBe("Profile updated successfully.");
  });

  it("should return an error message when name is too short", async () => {
    const result = await updateProfileAction(initialState, {
      name: "",
      email: "alice@example.com",
    });

    expect(result.success).toBe(false);
    expect(result.message).toContain("name");
  });

  it("should return an error message when email is invalid", async () => {
    const result = await updateProfileAction(initialState, {
      name: "Alice Smith",
      email: "not-an-email",
    });

    expect(result.success).toBe(false);
    expect(result.message).toContain("email");
  });

  it("should throw AuthenticationError when user is not authenticated", async () => {
    const { requireAuth } = await import("@/lib/auth");
    const { AuthenticationError } = await import("@/lib/errors");

    vi.mocked(requireAuth).mockRejectedValueOnce(new AuthenticationError());

    await expect(
      updateProfileAction(initialState, {
        name: "Alice",
        email: "alice@example.com",
      }),
    ).rejects.toBeInstanceOf(AuthenticationError);
  });
});
