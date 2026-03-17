import path from "node:path";
import { pathToFileURL } from "node:url";

import type { EnvContract, ValidationReport } from "./validation/types.js";

export type EnvTypegenPlugin = {
  name: string;
  transformContract?: (contract: EnvContract) => EnvContract;
  transformSource?: (input: {
    environment: string;
    values: Record<string, string>;
  }) => Record<string, string>;
  transformReport?: (report: ValidationReport) => ValidationReport;
};

export type PluginReference = string | EnvTypegenPlugin;

type LoadPluginsOptions = {
  pluginPaths: string[];
  configPlugins?: PluginReference[];
  cwd?: string;
};

type PluginModule = {
  default?: unknown;
  plugin?: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isPlugin(value: unknown): value is EnvTypegenPlugin {
  if (!isRecord(value)) return false;
  if (typeof value.name !== "string") return false;
  if (value.transformContract !== undefined && typeof value.transformContract !== "function") {
    return false;
  }
  if (value.transformSource !== undefined && typeof value.transformSource !== "function") {
    return false;
  }
  if (value.transformReport !== undefined && typeof value.transformReport !== "function") {
    return false;
  }
  return true;
}

async function loadPluginFromPath(pluginPath: string, cwd: string): Promise<EnvTypegenPlugin> {
  const resolvedPath = path.resolve(cwd, pluginPath);
  const moduleValue = (await import(pathToFileURL(resolvedPath).href)) as PluginModule;
  const candidate = moduleValue.default ?? moduleValue.plugin;
  if (isPlugin(candidate)) return candidate;
  throw new Error(
    `Invalid plugin at ${resolvedPath}.\n` +
      `Expected a default export matching:\n` +
      `  { name: string,\n` +
      `    transformSource?(ctx: { environment: string; values: Record<string, string> }): Record<string, string>,\n` +
      `    transformReport?(report: ValidationReport): ValidationReport,\n` +
      `    transformContract?(contract: EnvContract): EnvContract }`,
  );
}

export async function loadPlugins(options: LoadPluginsOptions): Promise<EnvTypegenPlugin[]> {
  const cwd = options.cwd ?? process.cwd();
  const plugins: EnvTypegenPlugin[] = [];

  const references: PluginReference[] = [...(options.configPlugins ?? []), ...options.pluginPaths];

  for (const reference of references) {
    if (typeof reference === "string") {
      plugins.push(await loadPluginFromPath(reference, cwd));
      continue;
    }
    if (isPlugin(reference)) {
      plugins.push(reference);
      continue;
    }
    throw new Error("Invalid plugin reference in configuration.");
  }

  return plugins;
}

export function applyContractPlugins(
  contract: EnvContract,
  plugins: readonly EnvTypegenPlugin[],
): EnvContract {
  let next = contract;
  for (const plugin of plugins) {
    if (plugin.transformContract === undefined) continue;
    next = plugin.transformContract(next);
  }
  return next;
}

export function applySourcePlugins(
  params: { environment: string; values: Record<string, string> },
  plugins: readonly EnvTypegenPlugin[],
): Record<string, string> {
  let next = params.values;
  for (const plugin of plugins) {
    if (plugin.transformSource === undefined) continue;
    next = plugin.transformSource({ environment: params.environment, values: next });
  }
  return next;
}

export function applyReportPlugins(
  report: ValidationReport,
  plugins: readonly EnvTypegenPlugin[],
): ValidationReport {
  let next = report;
  for (const plugin of plugins) {
    if (plugin.transformReport === undefined) continue;
    next = plugin.transformReport(next);
  }
  return next;
}
