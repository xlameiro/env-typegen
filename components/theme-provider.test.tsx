import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAppStore } from "@/store/use-app-store";
import { ThemeProvider } from "./theme-provider";

// jsdom does not implement matchMedia — stub it globally
function stubMatchMedia(prefersDark: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockImplementation((query: string) => ({
      matches: query.includes("prefers-color-scheme: dark") && prefersDark,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  );
}

beforeEach(() => {
  useAppStore.setState({ theme: "system" });
  document.documentElement.classList.remove("dark");
  stubMatchMedia(false);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("ThemeProvider", () => {
  it("should render children", () => {
    const { getByText } = render(
      <ThemeProvider>
        <span>child content</span>
      </ThemeProvider>,
    );
    expect(getByText("child content")).toBeInTheDocument();
  });

  it("should add 'dark' class when theme is set to 'dark'", () => {
    useAppStore.setState({ theme: "dark" });
    render(
      <ThemeProvider>
        <span>content</span>
      </ThemeProvider>,
    );
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("should not add 'dark' class when theme is set to 'light'", () => {
    useAppStore.setState({ theme: "light" });
    render(
      <ThemeProvider>
        <span>content</span>
      </ThemeProvider>,
    );
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("should add 'dark' class when theme is 'system' and prefers-dark is active", () => {
    stubMatchMedia(true);
    useAppStore.setState({ theme: "system" });
    render(
      <ThemeProvider>
        <span>content</span>
      </ThemeProvider>,
    );
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("should not add 'dark' class when theme is 'system' and prefers-dark is inactive", () => {
    stubMatchMedia(false);
    useAppStore.setState({ theme: "system" });
    render(
      <ThemeProvider>
        <span>content</span>
      </ThemeProvider>,
    );
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });
});
