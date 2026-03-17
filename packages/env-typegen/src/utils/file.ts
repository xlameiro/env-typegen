import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Reads a .env file from `filePath` and returns its full text content.
 * Throws a user-friendly error when the file does not exist (instead of exposing
 * the raw `ENOENT: no such file or directory, open '/internal/path'` Node message).
 */
export async function readEnvFile(filePath: string): Promise<string> {
  const resolved = path.resolve(filePath);
  try {
    return await readFile(resolved, "utf8");
  } catch (err) {
    if (err instanceof Error && (err as NodeJS.ErrnoException).code === "ENOENT") {
      const displayPath = path.isAbsolute(filePath)
        ? filePath
        : `${filePath} (resolved: ${resolved})`;
      throw new Error(`File not found: ${displayPath}`);
    }
    throw err;
  }
}

/**
 * Writes `content` to `filePath`, creating intermediate directories as needed.
 * Overwrites any existing file at that path.
 */
export async function writeOutput(filePath: string, content: string): Promise<void> {
  const resolved = path.resolve(filePath);
  await mkdir(path.dirname(resolved), { recursive: true });
  await writeFile(resolved, content, "utf8");
}
