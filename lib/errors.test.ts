import {
  AppError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ServiceUnavailableError,
  ValidationError,
  getStatusCode,
  isAppError,
} from "@/lib/errors";
import { describe, expect, it } from "vitest";

describe("AppError", () => {
  it("should store message, code, and statusCode", () => {
    const error = new AppError("Something failed", "INTERNAL_ERROR", 500);
    expect(error.message).toBe("Something failed");
    expect(error.code).toBe("INTERNAL_ERROR");
    expect(error.statusCode).toBe(500);
    expect(error.name).toBe("AppError");
  });

  it("should default statusCode to 500", () => {
    const error = new AppError("Fail", "FAIL");
    expect(error.statusCode).toBe(500);
  });

  it("should be an instance of Error", () => {
    const error = new AppError("test", "TEST");
    expect(error).toBeInstanceOf(Error);
  });

  it("should be an instance of AppError", () => {
    const error = new AppError("test", "TEST");
    expect(error).toBeInstanceOf(AppError);
  });
});

describe("AuthenticationError", () => {
  it("should have 401 status and UNAUTHORIZED code by default", () => {
    const error = new AuthenticationError();
    expect(error.statusCode).toBe(401);
    expect(error.code).toBe("UNAUTHORIZED");
    expect(error.name).toBe("AuthenticationError");
  });

  it("should use default message when none provided", () => {
    const error = new AuthenticationError();
    expect(error.message).toBe("You must be signed in to access this resource");
  });

  it("should accept a custom message", () => {
    const error = new AuthenticationError("Session expired");
    expect(error.message).toBe("Session expired");
  });

  it("should be an instance of AppError", () => {
    expect(new AuthenticationError()).toBeInstanceOf(AppError);
  });
});

describe("AuthorizationError", () => {
  it("should have 403 status and FORBIDDEN code by default", () => {
    const error = new AuthorizationError();
    expect(error.statusCode).toBe(403);
    expect(error.code).toBe("FORBIDDEN");
    expect(error.name).toBe("AuthorizationError");
  });

  it("should accept a custom message", () => {
    const error = new AuthorizationError("Admins only");
    expect(error.message).toBe("Admins only");
  });
});

describe("NotFoundError", () => {
  it("should include the resource name in the message", () => {
    const error = new NotFoundError("User");
    expect(error.message).toBe("User not found");
    expect(error.statusCode).toBe(404);
    expect(error.code).toBe("NOT_FOUND");
  });

  it("should use default resource name when none provided", () => {
    const error = new NotFoundError();
    expect(error.message).toBe("Resource not found");
  });
});

describe("ValidationError", () => {
  it("should have 422 status and VALIDATION_ERROR code", () => {
    const error = new ValidationError();
    expect(error.statusCode).toBe(422);
    expect(error.code).toBe("VALIDATION_ERROR");
    expect(error.name).toBe("ValidationError");
  });

  it("should default to an empty issues array", () => {
    const error = new ValidationError();
    expect(error.issues).toEqual([]);
  });

  it("should use the default message when none provided", () => {
    const error = new ValidationError();
    expect(error.message).toBe("Invalid input data");
  });

  it("should accept a custom message", () => {
    const error = new ValidationError("Fields are invalid");
    expect(error.message).toBe("Fields are invalid");
  });
});

describe("ServiceUnavailableError", () => {
  it("should include the service name and have 503 status", () => {
    const error = new ServiceUnavailableError("Database");
    expect(error.message).toBe("Database is temporarily unavailable");
    expect(error.statusCode).toBe(503);
    expect(error.code).toBe("SERVICE_UNAVAILABLE");
  });

  it("should use default service name when none provided", () => {
    const error = new ServiceUnavailableError();
    expect(error.message).toBe("Service is temporarily unavailable");
  });
});

describe("isAppError", () => {
  it("should return true for AppError instances", () => {
    expect(isAppError(new AppError("test", "TEST"))).toBe(true);
  });

  it("should return true for AppError subclasses", () => {
    expect(isAppError(new AuthenticationError())).toBe(true);
    expect(isAppError(new NotFoundError())).toBe(true);
    expect(isAppError(new ValidationError())).toBe(true);
  });

  it("should return false for regular Error instances", () => {
    expect(isAppError(new Error("test"))).toBe(false);
  });

  it("should return false for non-error values", () => {
    expect(isAppError(null)).toBe(false);
    expect(isAppError(undefined)).toBe(false);
    expect(isAppError("string")).toBe(false);
    expect(isAppError({ message: "fake", code: "FAKE" })).toBe(false);
  });
});

describe("getStatusCode", () => {
  it("should return the statusCode from AppError instances", () => {
    expect(getStatusCode(new NotFoundError())).toBe(404);
    expect(getStatusCode(new AuthenticationError())).toBe(401);
    expect(getStatusCode(new AuthorizationError())).toBe(403);
    expect(getStatusCode(new ValidationError())).toBe(422);
    expect(getStatusCode(new ServiceUnavailableError())).toBe(503);
  });

  it("should return 500 for regular Error instances", () => {
    expect(getStatusCode(new Error("test"))).toBe(500);
  });

  it("should return 500 for non-error values", () => {
    expect(getStatusCode("not an error")).toBe(500);
    expect(getStatusCode(null)).toBe(500);
    expect(getStatusCode(42)).toBe(500);
  });
});
