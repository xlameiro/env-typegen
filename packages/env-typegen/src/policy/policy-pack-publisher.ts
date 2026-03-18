import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  canPromotePolicyChannel,
  type PolicyDistributionChannel,
  type PolicyDistributionSink,
} from "./policy-channel.js";
import {
  computePolicyPackChecksum,
  normalizePolicyPackSource,
  parsePolicyPack,
} from "./policy-pack.js";

export type PolicyPackPublisherTarget = {
  sink: PolicyDistributionSink;
  destination: string;
};

export type PublishPolicyPackParams = {
  source: string;
  content: string;
  channel: PolicyDistributionChannel;
  target: PolicyPackPublisherTarget;
  promotedFrom?: PolicyDistributionChannel;
};

export type PolicyPackPublicationRecord = {
  id: string;
  version: number;
  channel: PolicyDistributionChannel;
  sink: PolicyDistributionSink;
  source: string;
  destination: string;
  checksum: string;
  publishedAt: string;
  promotedFrom?: PolicyDistributionChannel;
};

export function assertPolicyPackPromotion(params: {
  promotedFrom?: PolicyDistributionChannel;
  to: PolicyDistributionChannel;
}): void {
  if (params.promotedFrom === undefined) {
    return;
  }

  if (!canPromotePolicyChannel({ from: params.promotedFrom, to: params.to })) {
    throw new Error(
      `Invalid policy promotion path: ${params.promotedFrom} -> ${params.to}. Allowed paths are dev->stage and stage->prod.`,
    );
  }
}

function resolveLocalDestination(params: {
  baseDestination: string;
  channel: PolicyDistributionChannel;
  id: string;
  version: number;
}): string {
  return path.join(
    params.baseDestination,
    params.channel,
    `${params.id}@${params.version}.policy.json`,
  );
}

function resolveRemoteDescriptorPath(params: {
  baseDestination: string;
  channel: PolicyDistributionChannel;
  id: string;
  version: number;
}): string {
  return path.join(
    params.baseDestination,
    params.channel,
    `${params.id}@${params.version}.publish-request.json`,
  );
}

export async function publishPolicyPack(
  params: PublishPolicyPackParams,
): Promise<PolicyPackPublicationRecord> {
  assertPolicyPackPromotion({
    ...(params.promotedFrom === undefined ? {} : { promotedFrom: params.promotedFrom }),
    to: params.channel,
  });

  const normalizedSource = normalizePolicyPackSource(params.source, process.cwd());
  const parsedPack = parsePolicyPack(params.content, normalizedSource);
  const checksum = computePolicyPackChecksum(params.content);
  const publishedAt = new Date().toISOString();

  if (params.target.sink === "local") {
    const destination = resolveLocalDestination({
      baseDestination: params.target.destination,
      channel: params.channel,
      id: parsedPack.id,
      version: parsedPack.version,
    });

    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(destination, params.content, "utf8");

    return {
      id: parsedPack.id,
      version: parsedPack.version,
      channel: params.channel,
      sink: params.target.sink,
      source: normalizedSource,
      destination,
      checksum,
      publishedAt,
      ...(params.promotedFrom === undefined ? {} : { promotedFrom: params.promotedFrom }),
    };
  }

  const descriptorPath = resolveRemoteDescriptorPath({
    baseDestination: params.target.destination,
    channel: params.channel,
    id: parsedPack.id,
    version: parsedPack.version,
  });

  const descriptor = {
    id: parsedPack.id,
    version: parsedPack.version,
    channel: params.channel,
    sink: params.target.sink,
    source: normalizedSource,
    checksum,
    publishedAt,
    ...(params.promotedFrom === undefined ? {} : { promotedFrom: params.promotedFrom }),
  };

  await mkdir(path.dirname(descriptorPath), { recursive: true });
  await writeFile(descriptorPath, JSON.stringify(descriptor, null, 2), "utf8");

  return {
    ...descriptor,
    destination: descriptorPath,
  };
}
