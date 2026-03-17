import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CONFIG_FILE_NAMES, type InferenceRule } from "../src/config.js";
import type { RunGenerateOptions } from "../src/pipeline.js";
import type * as configModule from "../src/config.js";
import type * as loggerModule from "../src/utils/logger.js";
import type * as pipelineModule from "../src/pipeline.js";
import { startWatch } from "../src/watch.js";

const { watchMock, runGenerateMock, loadConfigMock, logMock, errorMock } = vi.hoisted(() => ({
  watchMock: vi.fn(),
  runGenerateMock: vi.fn<(...args: unknown[]) => Promise<void>>(),
  loadConfigMock: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
  logMock: vi.fn<(message: string) => void>(),
  errorMock: vi.fn<(message: string) => void>(),
}));

vi.mock("chokidar", () => ({
  watch: watchMock,
}));

vi.mock("../src/pipeline.js", async (importOriginal) => {
  const actualModule = await importOriginal<typeof pipelineModule>();
  return {
    ...actualModule,
    runGenerate: runGenerateMock,
  };
});

vi.mock("../src/config.js", async (importOriginal) => {
  const actualModule = await importOriginal<typeof configModule>();
  return {
    ...actualModule,
    loadConfig: loadConfigMock,
  };
});

vi.mock("../src/utils/logger.js", async (importOriginal) => {
  const actualModule = await importOriginal<typeof loggerModule>();
  return {
    ...actualModule,
    log: logMock,
    error: errorMock,
  };
});

type WatchCallback = (eventPath: string) => void;

type WatcherHarness = {
  onMock: ReturnType<typeof vi.fn>;
  closeMock: ReturnType<typeof vi.fn>;
  on: (eventName: string, callback: WatchCallback) => WatcherHarness;
  close: () => Promise<void>;
  emit: (eventName: string, eventPath: string) => void;
};

const watcherHarnesses: WatcherHarness[] = [];
let sigintHandler: (() => void) | undefined;

function createRunOptions(): RunGenerateOptions {
  return {
    input: ".env.example",
    output: "env.generated.ts",
    generators: ["typescript"],
    format: true,
  };
}

function createWatcherHarness(): WatcherHarness {
  const callbacksByEvent = new Map<string, WatchCallback[]>();
  const closeMock = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);
  const watcherHarness = {} as WatcherHarness;
  const onMock = vi.fn((eventName: string, callback: WatchCallback) => {
    const callbacks = callbacksByEvent.get(eventName) ?? [];
    callbacks.push(callback);
    callbacksByEvent.set(eventName, callbacks);
    return watcherHarness;
  });

  Object.assign(watcherHarness, {
    onMock,
    closeMock,
    on: onMock as unknown as WatcherHarness["on"],
    close: closeMock,
    emit: (eventName: string, eventPath: string) => {
      const callbacks = callbacksByEvent.get(eventName) ?? [];
      for (const callback of callbacks) {
        callback(eventPath);
      }
    },
  });

  return watcherHarness;
}

function getWatcherHarness(index: number): WatcherHarness {
  const watcherHarness = watcherHarnesses[index];
  if (watcherHarness === undefined) {
    throw new Error(`Watcher at index ${String(index)} was not created`);
  }
  return watcherHarness;
}

describe("startWatch", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    watcherHarnesses.length = 0;
    sigintHandler = undefined;

    watchMock.mockImplementation(() => {
      const watcherHarness = createWatcherHarness();
      watcherHarnesses.push(watcherHarness);
      return {
        on: watcherHarness.on,
        close: watcherHarness.close,
      };
    });

    runGenerateMock.mockResolvedValue(undefined);
    loadConfigMock.mockResolvedValue(undefined);

    vi.spyOn(process, "on").mockImplementation(((
      eventName: string,
      listener: (..._args: never[]) => void,
    ) => {
      if (eventName === "SIGINT") {
        sigintHandler = listener as () => void;
      }
      return process;
    }) as unknown as typeof process.on);

    vi.spyOn(process, "exit").mockImplementation(
      ((_code?: string | number | null | undefined) => undefined as never) as typeof process.exit,
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("should run once immediately and register input/config watchers", () => {
    const runOptions = createRunOptions();
    const inputPaths = [".env.example", ".env.local.example"];
    const cwd = "/workspace";

    startWatch({ inputPath: inputPaths, runOptions, cwd });

    expect(logMock).toHaveBeenCalledWith(
      "Watching .env.example, .env.local.example for changes...",
    );
    expect(runGenerateMock).toHaveBeenCalledTimes(1);
    expect(runGenerateMock).toHaveBeenCalledWith(runOptions);

    expect(watchMock).toHaveBeenCalledTimes(2);
    expect(watchMock).toHaveBeenNthCalledWith(1, inputPaths, { persistent: true });

    const configPaths = CONFIG_FILE_NAMES.map((name) => path.resolve(cwd, name));
    expect(watchMock).toHaveBeenNthCalledWith(2, configPaths, {
      persistent: true,
      ignoreInitial: true,
    });

    const inputWatcher = getWatcherHarness(0);
    expect(inputWatcher.onMock).toHaveBeenCalledWith("add", expect.any(Function));
    expect(inputWatcher.onMock).toHaveBeenCalledWith("change", expect.any(Function));
    expect(inputWatcher.onMock).toHaveBeenCalledWith("unlink", expect.any(Function));

    const configWatcher = getWatcherHarness(1);
    expect(configWatcher.onMock).toHaveBeenCalledWith("add", expect.any(Function));
    expect(configWatcher.onMock).toHaveBeenCalledWith("change", expect.any(Function));
  });

  it("should debounce input changes and report generation errors", async () => {
    const runOptions = createRunOptions();
    runGenerateMock
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error("input failed"));

    startWatch({ inputPath: ".env.example", runOptions });

    const inputWatcher = getWatcherHarness(0);
    inputWatcher.emit("change", "/tmp/.env.example");
    inputWatcher.emit("change", "/tmp/.env.local.example");

    expect(runGenerateMock).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(200);

    expect(logMock).toHaveBeenCalledWith("/tmp/.env.local.example changed, regenerating...");
    expect(runGenerateMock).toHaveBeenCalledTimes(2);
    expect(errorMock).toHaveBeenCalledWith("input failed");
  });

  it("should stringify non-Error values from the initial run", async () => {
    runGenerateMock.mockRejectedValueOnce({ reason: "initial failure" });

    startWatch({ inputPath: ".env.example", runOptions: createRunOptions() });
    await Promise.resolve();

    expect(errorMock).toHaveBeenCalledWith('{"reason":"initial failure"}');
  });

  it("should reload config changes and update run options", async () => {
    const runOptions = createRunOptions();
    const customRule: InferenceRule = {
      id: "custom",
      priority: 1,
      match: (key: string) => key === "APP_MODE",
      type: "string",
    };

    loadConfigMock.mockResolvedValue({
      input: ".env.example",
      generators: ["zod"],
      format: false,
      inferenceRules: [customRule],
    });
    runGenerateMock
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce({ reason: "regen failed" });

    startWatch({ inputPath: ".env.example", runOptions, cwd: "/workspace" });

    const configWatcher = getWatcherHarness(1);
    configWatcher.emit("change", "/workspace/env-typegen.config.ts");
    await vi.advanceTimersByTimeAsync(200);

    expect(logMock).toHaveBeenCalledWith(
      "Config file /workspace/env-typegen.config.ts changed, reloading...",
    );
    expect(loadConfigMock).toHaveBeenCalledWith("/workspace");
    expect(runOptions.generators).toEqual(["zod"]);
    expect(runOptions.format).toBe(false);
    expect(runOptions.inferenceRules).toEqual([customRule]);
    expect(runGenerateMock).toHaveBeenCalledTimes(2);
    expect(errorMock).toHaveBeenCalledWith('{"reason":"regen failed"}');
  });

  it("should report config reload failures", async () => {
    loadConfigMock.mockRejectedValueOnce(new Error("reload failed"));

    startWatch({ inputPath: ".env.example", runOptions: createRunOptions(), cwd: "/workspace" });

    const configWatcher = getWatcherHarness(1);
    configWatcher.emit("add", "/workspace/env-typegen.config.ts");
    await vi.advanceTimersByTimeAsync(200);

    expect(errorMock).toHaveBeenCalledWith("Failed to reload config: reload failed");
  });

  it("should close both watchers and exit on SIGINT", async () => {
    startWatch({ inputPath: ".env.example", runOptions: createRunOptions() });

    expect(sigintHandler).toBeTypeOf("function");
    sigintHandler?.();
    await vi.runAllTimersAsync();

    expect(getWatcherHarness(0).closeMock).toHaveBeenCalledTimes(1);
    expect(getWatcherHarness(1).closeMock).toHaveBeenCalledTimes(1);
    expect(logMock).toHaveBeenCalledWith("Watcher stopped.");
    expect(vi.mocked(process.exit)).toHaveBeenCalledWith(0);
  });
});
