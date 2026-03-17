import { describe, expect, it } from "vitest";

import * as envTypegen from "../src/index.js";

describe("public API index", () => {
  it("should expose documented runtime exports", () => {
    expect(typeof envTypegen.parseCommentBlock).toBe("function");
    expect(typeof envTypegen.parseEnvFileContent).toBe("function");
    expect(typeof envTypegen.parseEnvFile).toBe("function");
    expect(typeof envTypegen.inferType).toBe("function");
    expect(typeof envTypegen.inferTypes).toBe("function");
    expect(typeof envTypegen.generateTypeScriptTypes).toBe("function");
    expect(typeof envTypegen.generateEnvValidation).toBe("function");
    expect(typeof envTypegen.generateZodSchema).toBe("function");
    expect(typeof envTypegen.generateT3Env).toBe("function");
    expect(typeof envTypegen.generateDeclaration).toBe("function");
    expect(typeof envTypegen.defineConfig).toBe("function");
    expect(typeof envTypegen.loadConfig).toBe("function");
    expect(typeof envTypegen.runGenerate).toBe("function");
    expect(Array.isArray(envTypegen.inferenceRules)).toBe(true);
  });

  it("should parse and generate output through the public exports", () => {
    const parsed = envTypegen.parseEnvFileContent(
      "APP_URL=https://example.com\nAPP_PORT=3000\n",
      "/tmp/.env.example",
    );

    const generatedTypescript = envTypegen.generateTypeScriptTypes(parsed);
    const generatedZod = envTypegen.generateZodSchema(parsed);

    expect(generatedTypescript).toContain("APP_URL");
    expect(generatedTypescript).toContain("APP_PORT");
    expect(generatedZod).toContain("z.url()");
    expect(generatedZod).toContain("z.coerce.number()");
  });

  it("should keep defineConfig as an identity helper", () => {
    const config: Parameters<typeof envTypegen.defineConfig>[0] = {
      input: ".env.example",
      output: "env.generated.ts",
      generators: ["typescript"],
      format: false,
    };

    expect(envTypegen.defineConfig(config)).toBe(config);
  });
});
