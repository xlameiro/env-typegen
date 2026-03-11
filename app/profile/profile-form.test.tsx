import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ProfileForm } from "./profile-form";

// Mock the Server Action — it cannot run in jsdom
vi.mock("./actions", () => ({
  updateProfileAction: vi.fn().mockResolvedValue({
    success: true,
    message: "Profile updated successfully.",
  }),
}));

const defaultValues = { name: "Alice Smith", email: "alice@example.com" };

describe("ProfileForm", () => {
  it("should render name and email fields", () => {
    render(<ProfileForm defaultValues={defaultValues} />);
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
  });

  it("should pre-fill fields from defaultValues", () => {
    render(<ProfileForm defaultValues={defaultValues} />);
    expect(screen.getByLabelText(/name/i)).toHaveValue("Alice Smith");
    expect(screen.getByLabelText(/email/i)).toHaveValue("alice@example.com");
  });

  it("should render the Save changes button", () => {
    render(<ProfileForm defaultValues={defaultValues} />);
    expect(
      screen.getByRole("button", { name: /save changes/i }),
    ).toBeInTheDocument();
  });

  it("should show validation error when name is cleared and form is submitted", async () => {
    render(<ProfileForm defaultValues={defaultValues} />);
    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: "" } });
    const form = (
      screen.getByRole("button", { name: /save changes/i }) as HTMLButtonElement
    ).closest("form") as HTMLFormElement;
    fireEvent.submit(form);
    await waitFor(() => {
      expect(screen.getByRole("alert", { hidden: true })).toBeInTheDocument();
    });
  });

  it("should show validation error when email is invalid", async () => {
    render(<ProfileForm defaultValues={defaultValues} />);
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "not-an-email" },
    });
    const form = (
      screen.getByRole("button", { name: /save changes/i }) as HTMLButtonElement
    ).closest("form") as HTMLFormElement;
    fireEvent.submit(form);
    await waitFor(() => {
      // There should be at least one error message rendered
      const alerts = document.querySelectorAll("[role='alert']");
      expect(alerts.length).toBeGreaterThan(0);
    });
  });
});
