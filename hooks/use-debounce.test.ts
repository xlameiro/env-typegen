import { useDebounce } from "@/hooks/use-debounce";
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("useDebounce", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("does not call the callback immediately", () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useDebounce(callback, 300));

    act(() => {
      result.current("test");
    });

    expect(callback).not.toHaveBeenCalled();
  });

  it("calls the callback after the delay elapses", () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useDebounce(callback, 300));

    act(() => {
      result.current("test");
      vi.advanceTimersByTime(300);
    });

    expect(callback).toHaveBeenCalledOnce();
    expect(callback).toHaveBeenCalledWith("test");
  });

  it("debounces multiple rapid calls — only the last fires", () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useDebounce(callback, 300));

    act(() => {
      result.current("first");
      result.current("second");
      result.current("third");
      vi.advanceTimersByTime(300);
    });

    expect(callback).toHaveBeenCalledOnce();
    expect(callback).toHaveBeenCalledWith("third");
  });

  it("does not call the callback if the timer has not elapsed yet", () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useDebounce(callback, 300));

    act(() => {
      result.current("test");
      vi.advanceTimersByTime(299);
    });

    expect(callback).not.toHaveBeenCalled();
  });

  it("should cancel a pending timer when the hook unmounts", () => {
    const callback = vi.fn();
    const { result, unmount } = renderHook(() => useDebounce(callback, 300));

    act(() => {
      result.current("test");
    });

    // Unmount before the timer fires — cleanup should clear the pending timer
    unmount();

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(callback).not.toHaveBeenCalled();
  });

  it("should not throw when unmounting without any pending timer", () => {
    // Covers the FALSE branch of `if (timerRef.current)` in the effect cleanup
    const callback = vi.fn();
    const { unmount } = renderHook(() => useDebounce(callback, 300));

    unmount(); // timerRef.current is null — cleanup skips clearTimeout

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(callback).not.toHaveBeenCalled();
  });
});
