import path from "node:path";
import { watch } from "chokidar";

import { loadConfig, CONFIG_FILE_NAMES } from "./config.js";
import type { RunGenerateOptions } from "./pipeline.js";
import { runGenerate } from "./pipeline.js";
import { error, log } from "./utils/logger.js";

type WatchOptions = {
  inputPath: string | string[];
  runOptions: RunGenerateOptions;
  /** CWD used to locate the config file; defaults to process.cwd(). */
  cwd?: string;
};

/** Debounced wrapper: the inner function is called at most once per `delay` ms. */
function debounce<TArgs extends unknown[]>(
  fn: (...args: TArgs) => void,
  delay: number,
): (...args: TArgs) => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return (...args: TArgs) => {
    if (timer !== undefined) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = undefined;
      fn(...args);
    }, delay);
  };
}

export function startWatch({ inputPath, runOptions, cwd = process.cwd() }: WatchOptions): void {
  const inputLabel = Array.isArray(inputPath) ? inputPath.join(", ") : inputPath;
  log(`Watching ${inputLabel} for changes...`);

  // Run once immediately on start
  void runGenerate(runOptions).catch((err: unknown) => {
    const message = err instanceof Error ? err.message : JSON.stringify(err);
    error(message);
  });

  const handleChange = debounce((eventPath: string) => {
    log(`${eventPath} changed, regenerating...`);
    void runGenerate(runOptions).catch((err: unknown) => {
      const message = err instanceof Error ? err.message : JSON.stringify(err);
      error(message);
    });
  }, 200);

  const handleConfigChange = debounce(async (eventPath: string) => {
    log(`Config file ${eventPath} changed, reloading...`);
    try {
      const reloaded = await loadConfig(cwd);
      if (reloaded) {
        // Apply updated generators/format/inferenceRules settings from the new config
        runOptions.generators = reloaded.generators ?? runOptions.generators;
        runOptions.format = reloaded.format ?? runOptions.format;
        if (reloaded.inferenceRules !== undefined) {
          runOptions.inferenceRules = reloaded.inferenceRules;
        }
      }
      void runGenerate(runOptions).catch((err: unknown) => {
        const message = err instanceof Error ? err.message : JSON.stringify(err);
        error(message);
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : JSON.stringify(err);
      error(`Failed to reload config: ${message}`);
    }
  }, 200);

  // Watch the input file — fire on create, modify, or delete+recreate
  const inputWatcher = watch(inputPath, { persistent: true });
  for (const event of ["add", "change", "unlink"] as const) {
    inputWatcher.on(event, handleChange);
  }

  // Watch config files so changes take effect without restarting
  const configPaths = CONFIG_FILE_NAMES.map((name) => path.resolve(cwd, name));
  const configWatcher = watch(configPaths, { persistent: true, ignoreInitial: true });
  for (const event of ["add", "change"] as const) {
    configWatcher.on(event, (eventPath: string) => void handleConfigChange(eventPath));
  }

  process.on("SIGINT", () => {
    void Promise.all([inputWatcher.close(), configWatcher.close()]).then(() => {
      log("Watcher stopped.");
      process.exit(0);
    });
  });
}
