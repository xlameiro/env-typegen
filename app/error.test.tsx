import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ErrorPage from "./error";

describe("ErrorPage", () => {
  it("should render the error heading and retry button", () => {
    const reset = vi.fn();
    render(<ErrorPage error={new Error("oops")} reset={reset} />);

    expect(
      screen.getByRole("heading", { name: /something went wrong/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /try again/i }),
    ).toBeInTheDocument();
  });

  it("should call reset when the Try again button is clicked", () => {
    const reset = vi.fn();
    render(<ErrorPage error={new Error("oops")} reset={reset} />);

    fireEvent.click(screen.getByRole("button", { name: /try again/i }));

    expect(reset).toHaveBeenCalledOnce();
  });

  it("should not show error message in non-development mode", () => {
    // Default test env is "test", so error details should be hidden
    render(<ErrorPage error={new Error("secret details")} reset={vi.fn()} />);

    expect(screen.queryByText("secret details")).not.toBeInTheDocument();
  });

  it("should show error message in development mode", () => {
    vi.stubEnv("NODE_ENV", "development");

    render(
      <ErrorPage error={new Error("dev error details")} reset={vi.fn()} />,
    );

    expect(screen.getByText("dev error details")).toBeInTheDocument();
    vi.unstubAllEnvs();
  });

  it("should log the error to the console", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const error = new Error("logged error");
    render(<ErrorPage error={error} reset={vi.fn()} />);

    expect(consoleSpy).toHaveBeenCalledWith(error);
    consoleSpy.mockRestore();
  });
});
