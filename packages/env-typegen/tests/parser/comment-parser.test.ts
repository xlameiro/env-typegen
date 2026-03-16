import { describe, expect, it } from "vitest";
import { parseCommentBlock } from "../../src/parser/comment-parser.js";

describe("parseCommentBlock", () => {
  describe("empty block", () => {
    it("should return default annotations for an empty comment block", () => {
      const result = parseCommentBlock([]);
      expect(result.isRequired).toBe(false);
      expect(result.annotatedType).toBeUndefined();
      expect(result.description).toBeUndefined();
    });
  });

  describe("@description annotation", () => {
    it("should extract a description from @description", () => {
      const result = parseCommentBlock(["# @description PostgreSQL connection string"]);
      expect(result.description).toBe("PostgreSQL connection string");
    });

    it("should trim whitespace from @description value", () => {
      const result = parseCommentBlock(["#   @description   padded description   "]);
      expect(result.description).toBe("padded description");
    });

    it("should ignore free-form lines when @description is already set", () => {
      const result = parseCommentBlock([
        "# @description Explicit description",
        "# This should not override",
      ]);
      expect(result.description).toBe("Explicit description");
    });
  });

  describe("@required annotation", () => {
    it("should set isRequired to true when @required is present", () => {
      const result = parseCommentBlock(["# @required"]);
      expect(result.isRequired).toBe(true);
    });

    it("should set isRequired to true regardless of surrounding annotations", () => {
      const result = parseCommentBlock([
        "# @description Some var",
        "# @required",
        "# @type string",
      ]);
      expect(result.isRequired).toBe(true);
    });
  });

  describe("@optional annotation", () => {
    it("should NOT set isRequired to true when @optional is present", () => {
      const result = parseCommentBlock(["# @optional"]);
      expect(result.isRequired).toBe(false);
    });
  });

  describe("@type annotation", () => {
    it("should extract a valid annotated type", () => {
      const result = parseCommentBlock(["# @type string"]);
      expect(result.annotatedType).toBe("string");
    });

    it("should extract 'url' as annotated type", () => {
      const result = parseCommentBlock(["# @type url"]);
      expect(result.annotatedType).toBe("url");
    });

    it("should ignore an unrecognised @type value", () => {
      const result = parseCommentBlock(["# @type invalid-type"]);
      expect(result.annotatedType).toBeUndefined();
    });
  });

  describe("free-form fallback description", () => {
    it("should use the first non-empty, non-annotation line as fallback description", () => {
      const result = parseCommentBlock(["# Database connection"]);
      expect(result.description).toBe("Database connection");
    });

    it("should use only the first free-form line as description", () => {
      const result = parseCommentBlock(["# First line", "# Second line"]);
      expect(result.description).toBe("First line");
    });

    it("should not use an annotation line as fallback description", () => {
      const result = parseCommentBlock(["# @required"]);
      expect(result.description).toBeUndefined();
    });
  });

  describe("combined annotations", () => {
    it("should parse a full JSDoc block correctly", () => {
      const result = parseCommentBlock([
        "# @description PostgreSQL connection string for the main database",
        "# @required",
        "# @type string",
      ]);
      expect(result.description).toBe("PostgreSQL connection string for the main database");
      expect(result.isRequired).toBe(true);
      expect(result.annotatedType).toBe("string");
    });

    it("should handle @required with an empty value annotation block", () => {
      const result = parseCommentBlock([
        "# @description Auth.js signing secret (>=32 chars)",
        "# @required",
      ]);
      expect(result.description).toBe("Auth.js signing secret (>=32 chars)");
      expect(result.isRequired).toBe(true);
      expect(result.annotatedType).toBeUndefined();
    });
  });
});
