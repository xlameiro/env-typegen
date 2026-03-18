import { readFile } from "node:fs/promises";

import { parsePolicyPackKeyring, type PolicyPackKeyring } from "./keyring.js";

export type ExternalTrustRootProvider = "aws-kms" | "gcp-kms" | "hashicorp-vault" | "external";

export type ExternalTrustRootConfig = {
  provider: ExternalTrustRootProvider;
  /**
   * Optional keyring document path used as a deterministic trust root source.
   * This keeps runtime reproducible for CI while allowing provider-scoped intent.
   */
  keyringPath?: string;
};

export async function loadExternalTrustRoot(
  config: ExternalTrustRootConfig,
): Promise<PolicyPackKeyring | undefined> {
  if (config.keyringPath === undefined) {
    return undefined;
  }

  const content = await readFile(config.keyringPath, "utf8");
  return parsePolicyPackKeyring(content, config.keyringPath);
}
