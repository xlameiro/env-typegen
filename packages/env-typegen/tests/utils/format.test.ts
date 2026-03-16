import { describe, expect, it } from "vitest";
import { formatOutput } from "../../src/utils/format.js";

describe("formatOutput", () => {
  it("should format TypeScript code with prettier", async () => {
    const unformatted = "export type Foo={a:string;b:number}";
    const result = await formatOutput(unformatted);
    // Prettier breaks this into multiple lines
    expect(result).toContain("export type Foo");
    expect(result).toContain("a: string");
    expect(result).toContain("b: number");
  });

  it("should add a trailing newline to formatted output", async () => {
    const result = await formatOutput("const x = 1;");
    expect(result.endsWith("\n")).toBe(true);
  });

  it("should use the typescript parser by default", async () => {
    // Type annotations are valid in TypeScript, invalid in plain JS
    const tsCode = "const x: string = 'hello';";
    const result = await formatOutput(tsCode);
    expect(result).toContain("const x: string");
  });

  it("should accept a custom babel parser for JS output", async () => {
    const jsCode = "const x = 1";
    const result = await formatOutput(jsCode, "babel");
    expect(result).toBeTruthy();
    expect(result).toContain("const x = 1");
  });

  it("should return the original content unchanged when formatting fails", async () => {
    // Passing a non-existent parser name causes prettier to throw at runtime,
    // which exercises the catch branch in formatOutput without any mocking.
    const content = "some content that would fail";
    const result = await formatOutput(content, "nonexistent-parser-44e7b3c2");
    expect(result).toBe(content);
  });
});
