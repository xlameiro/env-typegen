import { readFile } from "node:fs/promises";
import { loadExternalTrustRoot, type ExternalTrustRootConfig } from "./external-trust-root.js";
import {
  mergePolicyPackKeyrings,
  parsePolicyPackKeyring,
  type PolicyPackKeyring,
} from "./keyring.js";

export type TrustRootRegistryConfig = {
  keyring?: PolicyPackKeyring;
  keyringPath?: string;
  externalTrustRoot?: ExternalTrustRootConfig;
};

async function loadLocalKeyring(
  config: TrustRootRegistryConfig,
): Promise<PolicyPackKeyring | undefined> {
  if (config.keyring !== undefined) {
    return config.keyring;
  }

  if (config.keyringPath === undefined) {
    return undefined;
  }

  const content = await readFile(config.keyringPath, "utf8");
  return parsePolicyPackKeyring(content, config.keyringPath);
}

export async function resolveTrustRootKeyring(
  config: TrustRootRegistryConfig,
): Promise<PolicyPackKeyring | undefined> {
  const localKeyring = await loadLocalKeyring(config);
  const externalKeyring =
    config.externalTrustRoot === undefined
      ? undefined
      : await loadExternalTrustRoot(config.externalTrustRoot);

  if (localKeyring === undefined && externalKeyring === undefined) {
    return undefined;
  }

  if (localKeyring !== undefined && externalKeyring === undefined) {
    return localKeyring;
  }

  if (localKeyring === undefined && externalKeyring !== undefined) {
    return externalKeyring;
  }

  if (localKeyring === undefined || externalKeyring === undefined) {
    throw new Error("Trust root registry could not resolve deterministic keyring state.");
  }

  return mergePolicyPackKeyrings({
    primary: localKeyring,
    secondary: externalKeyring,
  });
}
