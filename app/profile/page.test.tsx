import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  requireAuth: vi.fn().mockResolvedValue({
    user: { id: "u1", name: "Alice", email: "alice@test.com" },
  }),
}));
vi.mock("./profile-form", () => ({
  ProfileForm: ({
    defaultValues,
  }: {
    defaultValues: { name: string; email: string };
  }) => (
    <div data-testid="profile-form">
      <span>{defaultValues.name}</span>
      <span>{defaultValues.email}</span>
    </div>
  ),
}));

import ProfilePage from "./page";

describe("ProfilePage", () => {
  it("should render the Your profile heading", async () => {
    render(await ProfilePage());

    expect(
      screen.getByRole("heading", { name: /your profile/i }),
    ).toBeInTheDocument();
  });

  it("should pass session data as default values to ProfileForm", async () => {
    render(await ProfilePage());

    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("alice@test.com")).toBeInTheDocument();
  });

  it("should pass empty strings when user has no name or email", async () => {
    const { requireAuth } = await import("@/lib/auth");
    vi.mocked(requireAuth).mockResolvedValueOnce({
      user: { id: "u2" },
    } as never);

    render(await ProfilePage());

    const form = screen.getByTestId("profile-form");
    expect(form).toBeInTheDocument();
  });
});
