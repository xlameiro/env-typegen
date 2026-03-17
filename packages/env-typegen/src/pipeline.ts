import path from "node:path";

import { type GeneratorName, type InferenceRule } from "./config.js";
import { generateDeclaration } from "./generators/declaration-generator.js";
import { generateT3Env } from "./generators/t3-generator.js";
import { generateTypeScriptTypes } from "./generators/typescript-generator.js";
import { generateZodSchema } from "./generators/zod-generator.js";
import { parseEnvFileContent } from "./parser/env-parser.js";
import type { ParsedEnvFile } from "./parser/types.js";
import { readEnvFile, writeOutput } from "./utils/file.js";
import { formatOutput } from "./utils/format.js";
import { success, warn } from "./utils/logger.js";

/** Options accepted by the runGenerate pipeline. */
export type RunGenerateOptions = {
  input: string | string[];
  output: string;
  generators: GeneratorName[];
  format: boolean;
  stdout?: boolean;
  dryRun?: boolean;
  silent?: boolean;
  /** Additional inference rules to prepend before built-in rules. */
  inferenceRules?: InferenceRule[];
};

/** Derive the output file path for a generator when multiple generators are in use. */
function deriveOutputPath(base: string, generator: GeneratorName, isSingle: boolean): string {
  if (isSingle) {
    // BUG-03: declaration generator must always produce a .d.ts file so TypeScript
    // and IDEs recognise it as an ambient declaration, even in single-format mode.
    if (generator === "declaration" && !base.endsWith(".d.ts")) {
      const ext = path.extname(base);
      const noExt = ext.length > 0 ? base.slice(0, -ext.length) : base;
      return `${noExt}.d.ts`;
    }
    return base;
  }
  const ext = path.extname(base);
  const noExt = ext.length > 0 ? base.slice(0, -ext.length) : base;
  // The declaration generator produces ambient TypeScript declarations (.d.ts).
  // Use the correct extension so IDEs and tsc pick it up as a declaration file.
  const baseExt = ext.length > 0 ? ext : ".ts";
  const outExt = generator === "declaration" ? ".d.ts" : baseExt;
  return `${noExt}.${generator}${outExt}`;
}

/**
 * When running against multiple input files, derive a per-input output base so
 * each file produces a distinct set of outputs. The input's basename (without
 * extension) is used as the stem; directory and extension come from the
 * user-supplied `output` option.
 *
 * Dotfiles (e.g. `.env.example`, `.env.extra`) share the same stem under
 * `path.basename(x, extname(x))` because both strip to `.env`, causing output
 * collision. When the basename starts with `.`, we use the full name minus the
 * leading dot, with internal dots replaced by dashes, as the stem:
 *   `.env.example` → `env-example`
 *   `.env.extra`   → `env-extra`
 */
function deriveOutputBaseForInput(output: string, inputPath: string): string {
  const dir = path.dirname(output);
  const ext = path.extname(output);
  const rawBasename = path.basename(inputPath);
  const stem = rawBasename.startsWith(".")
    ? rawBasename.slice(1).replaceAll(".", "-")
    : path.basename(inputPath, path.extname(inputPath));
  return path.join(dir, `${stem}${ext}`);
}

/** Invoke the correct generator function for the given name. */
function buildOutput(generator: GeneratorName, parsed: ParsedEnvFile): string {
  switch (generator) {
    case "typescript":
      return generateTypeScriptTypes(parsed);
    case "zod":
      return generateZodSchema(parsed);
    case "t3":
      return generateT3Env(parsed);
    case "declaration":
      return generateDeclaration(parsed);
  }
}

async function persistOutput(params: {
  generated: string;
  generator: GeneratorName;
  outputPath: string;
  isSingle: boolean;
  stdout: boolean;
  dryRun: boolean;
  silent: boolean;
}): Promise<void> {
  const { generated, generator, outputPath, isSingle, stdout, dryRun, silent } = params;

  if (stdout) {
    if (isSingle) {
      console.log(generated);
    } else {
      console.log(`// --- ${generator}:${outputPath} ---`);
      console.log(generated);
    }
    return;
  }

  if (dryRun) {
    if (!silent) {
      success(`Dry run: would write ${outputPath}`);
    }
    return;
  }

  await writeOutput(outputPath, generated);
  if (!silent) {
    success(`Generated ${outputPath}`);
  }
}

/**
 * Emit any parse-time warnings (e.g. `ENV_DUPLICATE_KEY`) via the warn logger.
 * Extracted from `runGenerate` to reduce its cognitive complexity.
 */
function emitParserWarnings(parsed: ParsedEnvFile): void {
  if (parsed.warnings === undefined) return;
  for (const w of parsed.warnings) {
    warn(`[${w.code}] ${w.message}`);
  }
}

/**
 * Reads the input file(s), runs the requested generators, optionally formats each
 * output, and writes the results to disk.
 *
 * Exported for unit testing — call this directly rather than spawning a child process.
 */
export async function runGenerate(options: RunGenerateOptions): Promise<void> {
  const {
    input,
    output,
    generators,
    format: shouldFormat,
    stdout = false,
    dryRun = false,
    silent = false,
    inferenceRules,
  } = options;
  const inputs = Array.isArray(input) ? input : [input];
  const hasMultipleInputs = inputs.length > 1;
  const isSingle = generators.length === 1;

  for (const inputPath of inputs) {
    const outputBase = hasMultipleInputs ? deriveOutputBaseForInput(output, inputPath) : output;
    const content = await readEnvFile(inputPath);
    const parsed = parseEnvFileContent(
      content,
      inputPath,
      inferenceRules === undefined ? undefined : { inferenceRules },
    );

    // Surface duplicate-key warnings detected during parsing.
    emitParserWarnings(parsed);

    for (const generator of generators) {
      let generated = buildOutput(generator, parsed);
      if (shouldFormat && !dryRun) {
        generated = await formatOutput(generated);
      }
      const outputPath = deriveOutputPath(outputBase, generator, isSingle);
      await persistOutput({
        generated,
        generator,
        outputPath,
        isSingle,
        stdout,
        dryRun,
        silent,
      });
    }
  }
}
