import { describe, expect, it } from "vitest";
import { generateZodSchema } from "../../src/generators/zod-generator.js";
import { parseEnvFileContent } from "../../src/parser/env-parser.js";

describe("generateZodSchema", () => {
  describe("output structure", () => {
    it("should include the zod import", () => {
      const parsed = parseEnvFileContent("KEY=value", "/test.env");
      const output = generateZodSchema(parsed);
      expect(output).toContain('from "zod"');
    });

    it("should export serverEnvSchema as a z.object", () => {
      const parsed = parseEnvFileContent("KEY=value", "/test.env");
      const output = generateZodSchema(parsed);
      expect(output).toContain("export const serverEnvSchema = z.object({");
    });

    it("should export clientEnvSchema as a z.object", () => {
      const parsed = parseEnvFileContent("KEY=value", "/test.env");
      const output = generateZodSchema(parsed);
      expect(output).toContain("export const clientEnvSchema = z.object({");
    });

    it("should export envSchema as serverEnvSchema.merge(clientEnvSchema)", () => {
      const parsed = parseEnvFileContent("KEY=value", "/test.env");
      const output = generateZodSchema(parsed);
      expect(output).toContain("export const envSchema = serverEnvSchema.merge(clientEnvSchema);");
    });

    it("should export the Env type via z.infer", () => {
      const parsed = parseEnvFileContent("KEY=value", "/test.env");
      const output = generateZodSchema(parsed);
      expect(output).toContain("export type Env = z.infer<typeof envSchema>");
    });

    it("should close the z.object call", () => {
      const parsed = parseEnvFileContent("KEY=value", "/test.env");
      const output = generateZodSchema(parsed);
      expect(output).toContain("});");
    });
  });

  describe("Zod type mapping", () => {
    it("should use z.string() for a plain string var", () => {
      const parsed = parseEnvFileContent("NODE_ENV=development", "/test.env");
      const output = generateZodSchema(parsed);
      expect(output).toContain("NODE_ENV: z.string(),");
    });

    it("should use z.coerce.number() for a number var", () => {
      const parsed = parseEnvFileContent("PORT=3000", "/test.env");
      const output = generateZodSchema(parsed);
      expect(output).toContain("PORT: z.coerce.number(),");
    });

    it("should use z.coerce.boolean() for a boolean var", () => {
      const parsed = parseEnvFileContent("DEBUG=true", "/test.env");
      const output = generateZodSchema(parsed);
      expect(output).toContain("DEBUG: z.coerce.boolean(),");
      expect(output).not.toContain('.transform((v) => v === "true")');
    });

    it("should use z.string().url() for a url var", () => {
      const parsed = parseEnvFileContent("APP_URL=https://example.com", "/test.env");
      const output = generateZodSchema(parsed);
      expect(output).toContain("APP_URL: z.string().url(),");
    });

    it("should use z.string().email() for an email var", () => {
      const parsed = parseEnvFileContent("SMTP_FROM=noreply@example.com", "/test.env");
      const output = generateZodSchema(parsed);
      expect(output).toContain("SMTP_FROM: z.string().email(),");
    });

    it("should use z.string() for a semver var", () => {
      const parsed = parseEnvFileContent("APP_VERSION=1.0.0", "/test.env");
      const output = generateZodSchema(parsed);
      expect(output).toContain("APP_VERSION: z.string(),");
    });

    it("should use z.string() for a json var", () => {
      const parsed = parseEnvFileContent('FLAGS={"analytics":true}', "/test.env");
      const output = generateZodSchema(parsed);
      expect(output).toContain("FLAGS: z.string(),");
    });
  });

  describe("optional vars", () => {
    it("should append .optional() for an optional var with unknown type", () => {
      const parsed = parseEnvFileContent("AUTH_SECRET=", "/test.env");
      const output = generateZodSchema(parsed);
      expect(output).toContain("AUTH_SECRET: z.string().optional(),");
    });

    it("should append .optional() for an optional number var", () => {
      const content = "# @type number\nOPT_PORT=";
      const parsed = parseEnvFileContent(content, "/test.env");
      const output = generateZodSchema(parsed);
      expect(output).toContain("OPT_PORT: z.coerce.number().optional(),");
    });

    it("should append .optional() after url for an optional url var", () => {
      const content = "# @type url\nOPT_URL=";
      const parsed = parseEnvFileContent(content, "/test.env");
      const output = generateZodSchema(parsed);
      expect(output).toContain("OPT_URL: z.string().url().optional(),");
    });

    it("should NOT append .optional() for a required var with a value", () => {
      const parsed = parseEnvFileContent("DATABASE_URL=postgresql://localhost/db", "/test.env");
      const output = generateZodSchema(parsed);
      expect(output).not.toContain("DATABASE_URL: z.string().url().optional()");
      expect(output).toContain("DATABASE_URL: z.string().url(),");
    });
  });

  describe("annotatedType override", () => {
    it("should use annotatedType string over inferred number", () => {
      const content = ["# @type string", "PORT=3000"].join("\n");
      const parsed = parseEnvFileContent(content, "/test.env");
      // PORT infers as 'number' but @type string overrides
      const output = generateZodSchema(parsed);
      expect(output).toContain("PORT: z.string(),");
      expect(output).not.toContain("z.coerce.number()");
    });

    it("should use annotatedType url for a var that looks like a string", () => {
      const content = ["# @type url", "ENDPOINT=not-yet-set"].join("\n");
      const parsed = parseEnvFileContent(content, "/test.env");
      const output = generateZodSchema(parsed);
      expect(output).toContain("ENDPOINT: z.string().url(),");
    });
  });

  describe("multiple variables", () => {
    it("should include all vars across both schemas", () => {
      const content = [
        "DATABASE_URL=postgresql://localhost/db",
        "PORT=3000",
        "DEBUG=false",
        "AUTH_SECRET=",
      ].join("\n");
      const parsed = parseEnvFileContent(content, "/test.env");
      const output = generateZodSchema(parsed);
      expect(output).toContain("DATABASE_URL:");
      expect(output).toContain("PORT:");
      expect(output).toContain("DEBUG:");
      expect(output).toContain("AUTH_SECRET:");
    });
  });

  describe("server / client split", () => {
    it("should put NEXT_PUBLIC_ vars into clientEnvSchema", () => {
      const content = [
        "DATABASE_URL=postgresql://localhost/db",
        "NEXT_PUBLIC_API_URL=https://api.example.com",
      ].join("\n");
      const parsed = parseEnvFileContent(content, "/test.env");
      const output = generateZodSchema(parsed);
      // clientEnvSchema should contain the NEXT_PUBLIC_ key
      const clientSection = output.slice(
        output.indexOf("export const clientEnvSchema"),
        output.indexOf("export const envSchema"),
      );
      expect(clientSection).toContain("NEXT_PUBLIC_API_URL:");
    });

    it("should put non-NEXT_PUBLIC_ vars into serverEnvSchema", () => {
      const content = [
        "DATABASE_URL=postgresql://localhost/db",
        "NEXT_PUBLIC_API_URL=https://api.example.com",
      ].join("\n");
      const parsed = parseEnvFileContent(content, "/test.env");
      const output = generateZodSchema(parsed);
      // serverEnvSchema section ends before clientEnvSchema
      const serverSection = output.slice(
        output.indexOf("export const serverEnvSchema"),
        output.indexOf("export const clientEnvSchema"),
      );
      expect(serverSection).toContain("DATABASE_URL:");
      expect(serverSection).not.toContain("NEXT_PUBLIC_API_URL:");
    });
  });
});
