import { useLocalStorage } from "@/hooks/use-local-storage";
import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

describe("useLocalStorage", () => {
  afterEach(() => {
    localStorage.clear();
  });

  it("should return the initial value when localStorage is empty", () => {
    const { result } = renderHook(() => useLocalStorage("key", "initial"));
    expect(result.current[0]).toBe("initial");
  });

  it("should read an existing value already in localStorage", () => {
    localStorage.setItem("persisted-key", JSON.stringify("stored-value"));
    const { result } = renderHook(() =>
      useLocalStorage("persisted-key", "initial"),
    );
    expect(result.current[0]).toBe("stored-value");
  });

  it("should update state and localStorage when setValue is called", () => {
    const { result } = renderHook(() => useLocalStorage("key", "initial"));

    act(() => {
      result.current[1]("updated");
    });

    expect(result.current[0]).toBe("updated");
    expect(JSON.parse(localStorage.getItem("key") ?? "null")).toBe("updated");
  });

  it("should support functional state updates", () => {
    const { result } = renderHook(() => useLocalStorage("count", 0));

    act(() => {
      result.current[1]((prev) => prev + 1);
    });

    expect(result.current[0]).toBe(1);
  });

  it("should remove the key and reset to initial value when removeValue is called", () => {
    localStorage.setItem("key", JSON.stringify("stored"));
    const { result } = renderHook(() => useLocalStorage("key", "initial"));

    act(() => {
      result.current[2]();
    });

    expect(result.current[0]).toBe("initial");
    expect(localStorage.getItem("key")).toBeNull();
  });

  it("should return initial value when localStorage contains malformed JSON", () => {
    localStorage.setItem("bad-key", "not-valid-json{");
    const { result } = renderHook(() => useLocalStorage("bad-key", "fallback"));
    expect(result.current[0]).toBe("fallback");
  });

  it("should handle objects as values", () => {
    const initial = { name: "Alice", age: 30 };
    const { result } = renderHook(() => useLocalStorage("user", initial));

    act(() => {
      result.current[1]({ name: "Bob", age: 25 });
    });

    expect(result.current[0]).toEqual({ name: "Bob", age: 25 });
  });
});
