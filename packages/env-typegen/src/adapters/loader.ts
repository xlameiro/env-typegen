import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";

import type { EnvAdapter } from "./types.js";

const requireFromLoader = createRequire(import.meta.url);

type LoadAdapterOptions = {
  cwd?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Returns a human-readable reason why `value` does not satisfy the EnvAdapter contract,
 * or `null` when the shape is valid.
 */
function diagnoseAdapter(value: unknown): string | null {
  if (!isRecord(value)) return `adapter is not an object (got ${typeof value})`;
  if (typeof value.name !== "string") return `"name" must be a string (got ${typeof value.name})`;
  if (typeof value.pull !== "function")
    return `"pull" must be a function (got ${typeof value.pull})`;
  if (value.push !== undefined && typeof value.push !== "function")
    return '"push" must be a function when defined';
  if (value.compare !== undefined && typeof value.compare !== "function")
    return '"compare" must be a function when defined';
  if (value.meta !== undefined && typeof value.meta !== "function")
    return '"meta" must be a function when defined';
  return null;
}

function isEnvAdapter(value: unknown): value is EnvAdapter {
  return diagnoseAdapter(value) === null;
}

function toImportTarget(modulePath: string): string {
  if (path.isAbsolute(modulePath)) {
    return pathToFileURL(modulePath).href;
  }
  return modulePath;
}

async function importAdapterModule(modulePath: string): Promise<unknown> {
  const moduleValue = (await import(toImportTarget(modulePath))) as {
    default?: unknown;
    adapter?: unknown;
  };
  return moduleValue.default ?? moduleValue.adapter ?? moduleValue;
}

export async function loadAdapter(
  adapterSpecifier: string,
  options: LoadAdapterOptions = {},
): Promise<EnvAdapter> {
  const cwd = options.cwd ?? process.cwd();

  if (adapterSpecifier.startsWith(".") || adapterSpecifier.startsWith("/")) {
    const resolvedPath = path.resolve(cwd, adapterSpecifier);
    const candidate = await importAdapterModule(resolvedPath);
    if (isEnvAdapter(candidate)) return candidate;
    const reason = diagnoseAdapter(candidate);
    throw new Error(
      `Invalid adapter module at "${resolvedPath}": ${reason}. ` +
        "Expected an object with { name: string, pull(): Promise<AdapterPullResult> }.",
    );
  }

  let directImportError: unknown;
  try {
    const candidate = await importAdapterModule(adapterSpecifier);
    if (isEnvAdapter(candidate)) return candidate;
    const reason = diagnoseAdapter(candidate);
    throw new Error(
      `Invalid adapter module "${adapterSpecifier}": ${reason}. ` +
        "Expected an object with { name: string, pull(): Promise<AdapterPullResult> }.",
    );
  } catch (error) {
    directImportError = error;
  }

  try {
    const resolvedFromProject = requireFromLoader.resolve(adapterSpecifier, {
      paths: [cwd],
    });
    const candidate = await importAdapterModule(resolvedFromProject);
    if (isEnvAdapter(candidate)) return candidate;
    const reason = diagnoseAdapter(candidate);
    throw new Error(
      `Invalid adapter module "${adapterSpecifier}" resolved from "${resolvedFromProject}": ` +
        `${reason}. Expected an object with { name: string, pull(): Promise<AdapterPullResult> }.`,
    );
  } catch {
    throw new Error(
      `Unable to load adapter "${adapterSpecifier}". ` +
        "Install the adapter package in the project or use a relative path in your config file.",
      { cause: directImportError },
    );
  }
}
