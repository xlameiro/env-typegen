import type {
  AdapterCompareResult,
  AdapterContext,
  AdapterDiffEntry,
  AdapterPullResult,
  EnvAdapter,
  EnvMap,
} from "./types.js";

type VercelEnvEntry = {
  key?: string;
  name?: string;
  value?: string;
  content?: string;
  target?: string | string[];
};

type VercelEnvResponse =
  | VercelEnvEntry[]
  | {
      envs?: VercelEnvEntry[];
      environmentVariables?: VercelEnvEntry[];
      pagination?: {
        next?: string | null;
      };
      next?: string | null;
    };

const MAX_RETRIES = 3;
const BASE_RETRY_DELAY_MS = 10;

function toArray(value: string | string[] | undefined): string[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

function isTargetMatch(entry: VercelEnvEntry, environment: string): boolean {
  const targets = toArray(entry.target);
  if (targets.length === 0) return true;
  return targets.includes(environment);
}

function parseVercelResponse(payload: VercelEnvResponse, environment: string): AdapterPullResult {
  const entries = Array.isArray(payload)
    ? payload
    : (payload.envs ?? payload.environmentVariables ?? []);
  const values: EnvMap = {};
  const warnings: string[] = [];

  for (const entry of entries) {
    const key = entry.key ?? entry.name;
    if (key === undefined || !isTargetMatch(entry, environment)) {
      continue;
    }

    const value = entry.value ?? entry.content;
    if (value === undefined) {
      warnings.push(`Entry ${key} has no readable value for target ${environment}.`);
      continue;
    }

    values[key] = value;
  }

  return {
    values,
    warnings,
    metadata: {
      source: "vercel",
      environment,
      count: Object.keys(values).length,
    },
  };
}

function getNextCursor(payload: VercelEnvResponse): string | null {
  if (Array.isArray(payload)) {
    return null;
  }

  const fromPagination = payload.pagination?.next;
  if (typeof fromPagination === "string" && fromPagination.length > 0) {
    return fromPagination;
  }

  const fromRoot = payload.next;
  if (typeof fromRoot === "string" && fromRoot.length > 0) {
    return fromRoot;
  }

  return null;
}

function buildCompareResult(localValues: EnvMap, remoteValues: EnvMap): AdapterCompareResult {
  const localKeys = new Set(Object.keys(localValues));
  const remoteKeys = new Set(Object.keys(remoteValues));

  const missingInRemote: string[] = [];
  const extraInRemote: string[] = [];
  const mismatches: AdapterDiffEntry[] = [];

  for (const key of localKeys) {
    if (!remoteKeys.has(key)) {
      missingInRemote.push(key);
      continue;
    }
    if (localValues[key] !== remoteValues[key]) {
      mismatches.push({ key, reason: "mismatch" });
    }
  }

  for (const key of remoteKeys) {
    if (!localKeys.has(key)) {
      extraInRemote.push(key);
    }
  }

  return { missingInRemote, extraInRemote, mismatches };
}

function isRetryableStatus(status: number): boolean {
  return status === 429 || (status >= 500 && status <= 599);
}

function wait(delayMs: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, delayMs);
  });
}

async function fetchWithRetry(endpoint: URL, token: string): Promise<Response> {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      const response = await fetch(endpoint, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        return response;
      }

      if (isRetryableStatus(response.status) && attempt < MAX_RETRIES) {
        await wait(BASE_RETRY_DELAY_MS * 2 ** attempt);
        continue;
      }

      throw new Error(`Vercel API request failed (${response.status}).`);
    } catch (error) {
      if (attempt < MAX_RETRIES) {
        await wait(BASE_RETRY_DELAY_MS * 2 ** attempt);
        continue;
      }

      if (error instanceof Error) {
        throw error;
      }

      throw new Error("Vercel API request failed after retries.");
    }
  }

  throw new Error("Vercel API request failed after retries.");
}

async function pull(context: AdapterContext): Promise<AdapterPullResult> {
  if (context.projectId === undefined || context.projectId.length === 0) {
    throw new Error("Vercel adapter requires projectId in provider config.");
  }
  if (context.token === undefined || context.token.length === 0) {
    throw new Error("Vercel adapter requires token in provider config.");
  }

  const values: EnvMap = {};
  const warnings: string[] = [];
  let pageCount = 0;
  let nextCursor: string | null = null;

  do {
    const endpoint = new URL(`https://api.vercel.com/v10/projects/${context.projectId}/env`);
    if (nextCursor !== null) {
      endpoint.searchParams.set("next", nextCursor);
    }

    const response = await fetchWithRetry(endpoint, context.token);
    const payload = (await response.json()) as VercelEnvResponse;
    const parsed = parseVercelResponse(payload, context.environment);

    Object.assign(values, parsed.values);
    warnings.push(...(parsed.warnings ?? []));
    nextCursor = getNextCursor(payload);
    pageCount += 1;
  } while (nextCursor !== null);

  return {
    values,
    warnings,
    metadata: {
      source: "vercel",
      environment: context.environment,
      count: Object.keys(values).length,
      pages: pageCount,
    },
  };
}

async function compare(
  _context: AdapterContext,
  localValues: EnvMap,
  remoteValues: EnvMap,
): Promise<AdapterCompareResult> {
  return buildCompareResult(localValues, remoteValues);
}

export const vercelAdapter: EnvAdapter = {
  name: "vercel",
  pull,
  compare,
  meta: () => ({
    name: "vercel",
    capabilities: {
      pull: true,
      push: false,
      compare: true,
      redactValuesByDefault: true,
    },
    supportedEnvironments: ["development", "preview", "production"],
  }),
};

export default vercelAdapter;
