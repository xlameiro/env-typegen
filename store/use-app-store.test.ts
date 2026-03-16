import { useAppStore } from "@/store/use-app-store";
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

describe("useAppStore", () => {
  beforeEach(() => {
    // Clear persisted state to prevent cross-test hydration
    localStorage.clear();
    act(() => {
      useAppStore.setState({ theme: "system" });
    });
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe("theme", () => {
    it("should have 'system' as the initial theme", () => {
      const { result } = renderHook(() => useAppStore((state) => state.theme));
      expect(result.current).toBe("system");
    });

    it("should update theme when setTheme is called with 'dark'", () => {
      const { result } = renderHook(() => useAppStore());

      act(() => {
        result.current.setTheme("dark");
      });

      expect(result.current.theme).toBe("dark");
    });

    it("should update theme when setTheme is called with 'light'", () => {
      const { result } = renderHook(() => useAppStore());

      act(() => {
        result.current.setTheme("light");
      });

      expect(result.current.theme).toBe("light");
    });
  });
});
