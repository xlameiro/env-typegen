import { auth } from "@/auth";
import { requireAuth } from "@/lib/auth";
import { AuthenticationError } from "@/lib/errors";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/auth", () => ({ auth: vi.fn() }));

const mockAuth = vi.mocked(auth);

describe("requireAuth", () => {
  beforeEach(() => {
    mockAuth.mockReset();
  });

  it("should return the session when a valid user session exists", async () => {
    const session = {
      user: { id: "u1", name: "Alice", email: "alice@test.com" },
    };
    mockAuth.mockResolvedValue(session as never);

    const result = await requireAuth();

    expect(result).toStrictEqual(session);
  });

  it("should throw AuthenticationError when auth() returns null", async () => {
    mockAuth.mockResolvedValue(null as never);

    await expect(requireAuth()).rejects.toBeInstanceOf(AuthenticationError);
  });

  it("should throw AuthenticationError when session has no user", async () => {
    mockAuth.mockResolvedValue({ user: undefined } as never);

    await expect(requireAuth()).rejects.toBeInstanceOf(AuthenticationError);
  });
});
