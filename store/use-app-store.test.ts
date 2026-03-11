import { useAppStore } from "@/store/use-app-store";
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

describe("useAppStore", () => {
  beforeEach(() => {
    // Clear persisted state to prevent cross-test hydration
    localStorage.clear();
    act(() => {
      useAppStore.setState({ theme: "system", sidebarOpen: false });
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

  describe("sidebarOpen", () => {
    it("should have sidebarOpen as false initially", () => {
      const { result } = renderHook(() =>
        useAppStore((state) => state.sidebarOpen),
      );
      expect(result.current).toBe(false);
    });

    it("should toggle sidebarOpen to true when toggleSidebar is called once", () => {
      const { result } = renderHook(() => useAppStore());

      act(() => {
        result.current.toggleSidebar();
      });

      expect(result.current.sidebarOpen).toBe(true);
    });

    it("should toggle sidebarOpen back to false on second call", () => {
      const { result } = renderHook(() => useAppStore());

      act(() => {
        result.current.toggleSidebar();
        result.current.toggleSidebar();
      });

      expect(result.current.sidebarOpen).toBe(false);
    });

    it("should set sidebarOpen to true when setSidebarOpen(true) is called", () => {
      const { result } = renderHook(() => useAppStore());

      act(() => {
        result.current.setSidebarOpen(true);
      });

      expect(result.current.sidebarOpen).toBe(true);
    });

    it("should set sidebarOpen to false when setSidebarOpen(false) is called", () => {
      const { result } = renderHook(() => useAppStore());

      act(() => {
        result.current.setSidebarOpen(true);
        result.current.setSidebarOpen(false);
      });

      expect(result.current.sidebarOpen).toBe(false);
    });
  });
});
