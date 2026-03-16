import { format } from "prettier";

/**
 * Formats `content` using prettier with the specified `parser`.
 * Defaults to the "typescript" parser, which is correct for all generator outputs.
 * Returns the original content unchanged if prettier throws (e.g., invalid syntax).
 */
export async function formatOutput(
  content: string,
  parser: string = "typescript",
): Promise<string> {
  try {
    return await format(content, { parser });
  } catch (err) {
    console.warn(
      "env-typegen: Prettier formatting failed, writing unformatted output.",
      err instanceof Error ? err.message : String(err),
    );
    return content;
  }
}
