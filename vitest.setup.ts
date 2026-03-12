import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";

// Ensure DOM cleanup happens after every test that uses @testing-library/react.
// Required when globals: true is not set in vitest.config.ts.
afterEach(cleanup);

// Suppress known React / jsdom console noise that does not signal real failures.
// Each pattern has a comment explaining why it is expected.
// Unknown messages are forwarded to the original handler so real bugs remain visible.
const SUPPRESSED_CONSOLE_ERRORS: RegExp[] = [
  // React 19: useActionState action dispatched outside startTransition in jsdom.
  // This is a testing-environment limitation — the component works correctly at runtime.
  /An async function with useActionState was called outside of a transition/,
  // React dev-mode error-boundary diagnostic messages emitted after a caught render error.
  /The above error occurred in/,
  /Consider adding an error boundary/,
];

const originalConsoleError = console.error.bind(console);

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
    const message = typeof args[0] === "string" ? args[0] : "";
    if (SUPPRESSED_CONSOLE_ERRORS.some((pattern) => pattern.test(message)))
      return;
    originalConsoleError(...args);
  });
});

// Restore all spies after each test so individual tests can still assert on console.error.
afterEach(() => {
  vi.restoreAllMocks();
});
