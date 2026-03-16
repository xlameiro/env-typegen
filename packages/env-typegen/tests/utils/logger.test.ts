import { afterEach, describe, expect, it, vi } from "vitest";
import { error, log, success, warn } from "../../src/utils/logger.js";

describe("logger", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("log", () => {
    it("should call console.log with the exact message", () => {
      const spy = vi.spyOn(console, "log").mockImplementation(() => {});
      log("hello world");
      expect(spy).toHaveBeenCalledOnce();
      expect(spy).toHaveBeenCalledWith("hello world");
    });

    it("should pass the message through unchanged", () => {
      const spy = vi.spyOn(console, "log").mockImplementation(() => {});
      log("plain message");
      const calledWith = spy.mock.calls[0]?.[0] as string;
      expect(calledWith).toBe("plain message");
    });
  });

  describe("warn", () => {
    it("should call console.warn with a colored message containing the original text", () => {
      const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
      warn("something degraded");
      expect(spy).toHaveBeenCalledOnce();
      const calledWith = spy.mock.calls[0]?.[0] as string;
      expect(calledWith).toContain("something degraded");
    });

    it("should include the warning symbol ⚠ in the output", () => {
      const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
      warn("disk full");
      const calledWith = spy.mock.calls[0]?.[0] as string;
      expect(calledWith).toContain("⚠");
    });
  });

  describe("error", () => {
    it("should call console.error with a colored message containing the original text", () => {
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});
      error("fatal failure");
      expect(spy).toHaveBeenCalledOnce();
      const calledWith = spy.mock.calls[0]?.[0] as string;
      expect(calledWith).toContain("fatal failure");
    });

    it("should include the error symbol ✖ in the output", () => {
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});
      error("connection refused");
      const calledWith = spy.mock.calls[0]?.[0] as string;
      expect(calledWith).toContain("✖");
    });
  });

  describe("success", () => {
    it("should call console.log with a colored message containing the original text", () => {
      const spy = vi.spyOn(console, "log").mockImplementation(() => {});
      success("build finished");
      expect(spy).toHaveBeenCalledOnce();
      const calledWith = spy.mock.calls[0]?.[0] as string;
      expect(calledWith).toContain("build finished");
    });

    it("should include the success symbol ✔ in the output", () => {
      const spy = vi.spyOn(console, "log").mockImplementation(() => {});
      success("all tests passed");
      const calledWith = spy.mock.calls[0]?.[0] as string;
      expect(calledWith).toContain("✔");
    });
  });
});
