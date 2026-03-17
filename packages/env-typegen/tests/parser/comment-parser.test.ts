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

  describe("@enum annotation", () => {
    it("should parse a comma-separated list of enum values", () => {
      const result = parseCommentBlock(["# @enum development,staging,production"]);
      expect(result.enumValues).toEqual(["development", "staging", "production"]);
    });

    it("should trim whitespace around each enum value", () => {
      const result = parseCommentBlock(["# @enum  a , b , c "]);
      expect(result.enumValues).toEqual(["a", "b", "c"]);
    });

    it("should ignore an empty @enum value list", () => {
      const result = parseCommentBlock(["# @enum "]);
      expect(result.enumValues).toBeUndefined();
    });

    it("should set enumValues to undefined when @enum is absent", () => {
      const result = parseCommentBlock(["# @required"]);
      expect(result.enumValues).toBeUndefined();
    });
  });

  describe("@min annotation", () => {
    it("should parse a valid integer minimum constraint", () => {
      const result = parseCommentBlock(["# @min 3"]);
      expect(result.constraints?.min).toBe(3);
    });

    it("should parse a floating-point minimum", () => {
      const result = parseCommentBlock(["# @min 0.5"]);
      expect(result.constraints?.min).toBe(0.5);
    });

    it("should ignore a non-numeric @min value", () => {
      const result = parseCommentBlock(["# @min abc"]);
      expect(result.constraints).toBeUndefined();
    });
  });

  describe("@max annotation", () => {
    it("should parse a valid integer maximum constraint", () => {
      const result = parseCommentBlock(["# @max 65535"]);
      expect(result.constraints?.max).toBe(65535);
    });

    it("should parse a floating-point maximum", () => {
      const result = parseCommentBlock(["# @max 1.5"]);
      expect(result.constraints?.max).toBe(1.5);
    });

    it("should ignore a non-numeric @max value", () => {
      const result = parseCommentBlock(["# @max NaN"]);
      expect(result.constraints).toBeUndefined();
    });
  });

  describe("combined @min + @max", () => {
    it("should produce a constraints object with both min and max", () => {
      const result = parseCommentBlock(["# @min 1", "# @max 100"]);
      expect(result.constraints).toEqual({ min: 1, max: 100 });
    });

    it("should produce a constraints object with only min when @max is absent", () => {
      const result = parseCommentBlock(["# @min 0"]);
      expect(result.constraints).toEqual({ min: 0 });
    });

    it("should produce a constraints object with only max when @min is absent", () => {
      const result = parseCommentBlock(["# @max 50"]);
      expect(result.constraints).toEqual({ max: 50 });
    });
  });

  describe("@runtime annotation", () => {
    it("should accept 'server' as a valid runtime value", () => {
      const result = parseCommentBlock(["# @runtime server"]);
      expect(result.runtime).toBe("server");
    });

    it("should accept 'client' as a valid runtime value", () => {
      const result = parseCommentBlock(["# @runtime client"]);
      expect(result.runtime).toBe("client");
    });

    it("should accept 'edge' as a valid runtime value", () => {
      const result = parseCommentBlock(["# @runtime edge"]);
      expect(result.runtime).toBe("edge");
    });

    it("should ignore an invalid @runtime value", () => {
      const result = parseCommentBlock(["# @runtime browser"]);
      expect(result.runtime).toBeUndefined();
    });

    it("should set runtime to undefined when @runtime is absent", () => {
      const result = parseCommentBlock(["# @required"]);
      expect(result.runtime).toBeUndefined();
    });
  });

  describe("@secret annotation", () => {
    it("should set isSecret to true when @secret is present", () => {
      const result = parseCommentBlock(["# @secret"]);
      expect(result.isSecret).toBe(true);
    });

    it("should set isSecret to undefined when @secret is absent", () => {
      const result = parseCommentBlock(["# @required"]);
      expect(result.isSecret).toBeUndefined();
    });

    it("should set isSecret alongside other annotations", () => {
      const result = parseCommentBlock([
        "# @description JWT signing key",
        "# @required",
        "# @secret",
      ]);
      expect(result.isSecret).toBe(true);
      expect(result.description).toBe("JWT signing key");
      expect(result.isRequired).toBe(true);
    });
  });
});
