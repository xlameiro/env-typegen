import { describe, expect, it } from "vitest";
import { generateT3Env } from "../../src/generators/t3-generator.js";
import { parseEnvFileContent } from "../../src/parser/env-parser.js";

describe("generateT3Env", () => {
  describe("output structure", () => {
    it("should include the createEnv import", () => {
      const parsed = parseEnvFileContent("KEY=value", "/test.env");
      const output = generateT3Env(parsed);
      expect(output).toContain('import { createEnv } from "@t3-oss/env-nextjs"');
    });

    it("should include the zod import", () => {
      const parsed = parseEnvFileContent("KEY=value", "/test.env");
      const output = generateT3Env(parsed);
      expect(output).toContain('import { z } from "zod"');
    });

    it("should export the env constant via createEnv", () => {
      const parsed = parseEnvFileContent("KEY=value", "/test.env");
      const output = generateT3Env(parsed);
      expect(output).toContain("export const env = createEnv({");
    });

    it("should close the createEnv call", () => {
      const parsed = parseEnvFileContent("KEY=value", "/test.env");
      const output = generateT3Env(parsed);
      expect(output).toContain("});");
    });

    it("should always include the runtimeEnv section", () => {
      const parsed = parseEnvFileContent("KEY=value", "/test.env");
      const output = generateT3Env(parsed);
      expect(output).toContain("runtimeEnv: {");
    });
  });

  describe("server/client split", () => {
    it("should place non-NEXT_PUBLIC_ vars in the server section", () => {
      const content = "DATABASE_URL=postgres://localhost/db\nSECRET=abc";
      const parsed = parseEnvFileContent(content, "/test.env");
      const output = generateT3Env(parsed);
      expect(output).toContain("server: {");
      expect(output).toContain("DATABASE_URL:");
      expect(output).toContain("SECRET:");
    });

    it("should place NEXT_PUBLIC_ vars in the client section", () => {
      const content =
        "DATABASE_URL=postgres://localhost/db\nNEXT_PUBLIC_APP_URL=https://example.com";
      const parsed = parseEnvFileContent(content, "/test.env");
      const output = generateT3Env(parsed);
      expect(output).toContain("client: {");
      expect(output).toContain("NEXT_PUBLIC_APP_URL:");
    });

    it("should omit the client section when there are no NEXT_PUBLIC_ vars", () => {
      const content = "DATABASE_URL=postgres://localhost/db\nSECRET=abc";
      const parsed = parseEnvFileContent(content, "/test.env");
      const output = generateT3Env(parsed);
      expect(output).not.toContain("client: {");
    });

    it("should omit the server section when all vars are client-side", () => {
      const content = "NEXT_PUBLIC_APP_URL=https://example.com\nNEXT_PUBLIC_ID=G-123";
      const parsed = parseEnvFileContent(content, "/test.env");
      const output = generateT3Env(parsed);
      expect(output).not.toContain("server: {");
    });

    it("should include all vars in runtimeEnv regardless of client/server", () => {
      const content = "SECRET=abc\nNEXT_PUBLIC_APP_URL=https://example.com";
      const parsed = parseEnvFileContent(content, "/test.env");
      const output = generateT3Env(parsed);
      expect(output).toContain("SECRET: process.env.SECRET,");
      expect(output).toContain("NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,");
    });
  });

  describe("Zod type mapping", () => {
    it("should use z.string() for a plain string var", () => {
      const parsed = parseEnvFileContent("TOKEN=abc", "/test.env");
      const output = generateT3Env(parsed);
      expect(output).toContain("TOKEN: z.string(),");
    });

    it("should use z.coerce.number() for a number var", () => {
      const parsed = parseEnvFileContent("PORT=3000", "/test.env");
      const output = generateT3Env(parsed);
      expect(output).toContain("PORT: z.coerce.number(),");
    });

    it("should use z.coerce.boolean() for a boolean var (not .transform)", () => {
      const parsed = parseEnvFileContent("DEBUG=true", "/test.env");
      const output = generateT3Env(parsed);
      expect(output).toContain("DEBUG: z.coerce.boolean(),");
      expect(output).not.toContain("transform");
    });

    it("should use z.string().url() for a url var", () => {
      const parsed = parseEnvFileContent("DATABASE_URL=postgres://localhost/db", "/test.env");
      const output = generateT3Env(parsed);
      expect(output).toContain("DATABASE_URL: z.string().url(),");
    });

    it("should use z.string().email() for an email var", () => {
      const parsed = parseEnvFileContent("SMTP_FROM=noreply@example.com", "/test.env");
      const output = generateT3Env(parsed);
      expect(output).toContain("SMTP_FROM: z.string().email(),");
    });

    it("should use z.string() for semver vars", () => {
      const parsed = parseEnvFileContent("APP_VERSION=1.0.0", "/test.env");
      const output = generateT3Env(parsed);
      expect(output).toContain("APP_VERSION: z.string(),");
    });
  });

  describe("optional vars", () => {
    it("should append .optional() for vars with empty values", () => {
      const parsed = parseEnvFileContent("WEBHOOK_URL=", "/test.env");
      const output = generateT3Env(parsed);
      expect(output).toContain("WEBHOOK_URL: z.string().url().optional(),");
    });

    it("should append .optional() after the Zod type for optional number var", () => {
      const parsed = parseEnvFileContent("TIMEOUT=", "/test.env");
      const output = generateT3Env(parsed);
      // empty value inferred as 'unknown' → z.string().optional()
      expect(output).toContain("TIMEOUT: z.string().optional(),");
    });
  });

  describe("description (.describe)", () => {
    it("should append .describe() when the var has a description", () => {
      const content = "# @description Main database URL\nDATABASE_URL=postgres://localhost/db";
      const parsed = parseEnvFileContent(content, "/test.env");
      const output = generateT3Env(parsed);
      expect(output).toContain('.describe("Main database URL")');
    });

    it("should not append .describe() when no description is set", () => {
      const parsed = parseEnvFileContent("SECRET=abc", "/test.env");
      const output = generateT3Env(parsed);
      expect(output).not.toContain(".describe(");
    });

    it("should place .describe() before .optional()", () => {
      const content = "# @description Optional webhook\nWEBHOOK_URL=";
      const parsed = parseEnvFileContent(content, "/test.env");
      const output = generateT3Env(parsed);
      const describeIdx = output.indexOf(".describe(");
      const optionalIdx = output.indexOf(".optional()");
      expect(describeIdx).toBeGreaterThan(-1);
      expect(optionalIdx).toBeGreaterThan(-1);
      expect(describeIdx).toBeLessThan(optionalIdx);
    });

    it("should escape double-quotes in description to avoid corrupting generated code", () => {
      // A description containing " must be escaped so the .describe("...") call is valid syntax
      const content =
        '# @description It\'s a "main" database URL\nDATABASE_URL=postgres://localhost/db';
      const parsed = parseEnvFileContent(content, "/test.env");
      const output = generateT3Env(parsed);
      // Should produce .describe("It's a \"main\" database URL") — not .describe("It's a "main" database URL")
      expect(output).toContain('.describe("It\'s a \\"main\\" database URL")');
    });
  });

  describe("annotatedType override", () => {
    it("should use annotatedType over inferredType for Zod expression", () => {
      // PORT=3000 would infer 'number', but @type boolean should override
      const content = "# @type boolean\nPORT=3000";
      const parsed = parseEnvFileContent(content, "/test.env");
      const output = generateT3Env(parsed);
      expect(output).toContain("PORT: z.coerce.boolean(),");
      expect(output).not.toContain("z.coerce.number()");
    });
  });
});
