import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Reads a .env file from `filePath` and returns its full text content.
 * Rejects with a Node.js filesystem error if the file does not exist.
 */
export async function readEnvFile(filePath: string): Promise<string> {
  return readFile(path.resolve(filePath), "utf8");
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
