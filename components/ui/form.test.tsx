import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FormError, FormField, FormInput, FormMessage } from "./form";

describe("FormError", () => {
  it("should render nothing when message is undefined", () => {
    render(<FormError />);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("should render nothing when message is an empty string", () => {
    render(<FormError message="" />);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("should render the error message with role=alert", () => {
    render(<FormError id="name-error" message="Name is required" />);
    const error = screen.getByRole("alert");
    expect(error.textContent).toBe("Name is required");
  });

  it("should apply the provided id", () => {
    render(<FormError id="email-error" message="Invalid email" />);
    const error = screen.getByRole("alert");
    expect(error.getAttribute("id")).toBe("email-error");
  });
});

describe("FormMessage", () => {
  it("should render nothing when message is undefined", () => {
    const { container } = render(<FormMessage />);
    expect(container.firstChild).toBeNull();
  });

  it("should use role=status for success type", () => {
    render(<FormMessage type="success" message="Saved successfully!" />);
    expect(screen.getByRole("status")).toBeDefined();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("should use role=alert for error type", () => {
    render(<FormMessage type="error" message="Something went wrong." />);
    expect(screen.getByRole("alert")).toBeDefined();
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("should use role=status for info type", () => {
    render(<FormMessage type="info" message="Just a note." />);
    expect(screen.getByRole("status")).toBeDefined();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("should use role=status by default (no type prop)", () => {
    render(<FormMessage message="Default message" />);
    expect(screen.getByRole("status")).toBeDefined();
  });

  it("should render the message text", () => {
    render(<FormMessage type="success" message="Profile updated!" />);
    expect(screen.getByRole("status").textContent).toBe("Profile updated!");
  });
});

describe("FormInput", () => {
  it("should render an input element", () => {
    render(<FormInput type="text" />);
    expect(screen.getByRole("textbox")).toBeDefined();
  });

  it("should set aria-invalid when hasError is true", () => {
    render(<FormInput type="text" hasError errorId="name-error" />);
    const input = screen.getByRole("textbox");
    expect(input.getAttribute("aria-invalid")).toBe("true");
  });

  it("should set aria-describedby when hasError and errorId are provided", () => {
    render(<FormInput type="text" hasError errorId="name-error" />);
    const input = screen.getByRole("textbox");
    expect(input.getAttribute("aria-describedby")).toBe("name-error");
  });

  it("should not set aria-invalid when hasError is false", () => {
    render(<FormInput type="text" />);
    const input = screen.getByRole("textbox");
    expect(input.getAttribute("aria-invalid")).toBeNull();
  });

  it("should not set aria-describedby when hasError is false", () => {
    render(<FormInput type="text" errorId="name-error" />);
    const input = screen.getByRole("textbox");
    expect(input.getAttribute("aria-describedby")).toBeNull();
  });

  it("should pass through standard HTML input attributes", () => {
    render(<FormInput type="email" placeholder="Enter email" id="email" />);
    const input = screen.getByRole("textbox");
    expect(input.getAttribute("type")).toBe("email");
    expect(input.getAttribute("placeholder")).toBe("Enter email");
    expect(input.getAttribute("id")).toBe("email");
  });

  it("should merge custom className with base styles", () => {
    render(<FormInput type="text" className="mt-4" />);
    const input = screen.getByRole("textbox");
    expect(input.className).toContain("mt-4");
    expect(input.className).toContain("rounded-md");
  });
});

describe("FormField", () => {
  it("should render the label with the correct htmlFor", () => {
    render(
      <FormField label="Name" htmlFor="name">
        <input id="name" type="text" />
      </FormField>,
    );
    const label = screen.getByText("Name");
    expect(label.tagName.toLowerCase()).toBe("label");
    expect(label.getAttribute("for")).toBe("name");
  });

  it("should render a required indicator when required is true", () => {
    render(
      <FormField label="Email" htmlFor="email" required>
        <input id="email" type="email" />
      </FormField>,
    );
    const indicator = screen.getByText("*");
    expect(indicator.getAttribute("aria-hidden")).toBe("true");
  });

  it("should not render a required indicator when required is false", () => {
    render(
      <FormField label="Email" htmlFor="email">
        <input id="email" type="email" />
      </FormField>,
    );
    expect(screen.queryByText("*")).toBeNull();
  });

  it("should render an inline error when error is provided", () => {
    render(
      <FormField
        label="Email"
        htmlFor="email"
        error={{ type: "required", message: "Email is required" }}
      >
        <input id="email" type="email" />
      </FormField>,
    );
    expect(screen.getByRole("alert").textContent).toBe("Email is required");
  });

  it("should not render an error when no error is provided", () => {
    render(
      <FormField label="Email" htmlFor="email">
        <input id="email" type="email" />
      </FormField>,
    );
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
