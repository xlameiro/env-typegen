export type PolicyDistributionChannel = "dev" | "stage" | "prod";

export type PolicyDistributionSink = "local" | "s3" | "github-packages";

export type PolicyChannelPromotion = {
  from: PolicyDistributionChannel;
  to: PolicyDistributionChannel;
};

const allowedPromotions: ReadonlyArray<PolicyChannelPromotion> = [
  { from: "dev", to: "stage" },
  { from: "stage", to: "prod" },
];

export function isPolicyDistributionChannel(value: unknown): value is PolicyDistributionChannel {
  return value === "dev" || value === "stage" || value === "prod";
}

export function isPolicyDistributionSink(value: unknown): value is PolicyDistributionSink {
  return value === "local" || value === "s3" || value === "github-packages";
}

export function canPromotePolicyChannel(params: PolicyChannelPromotion): boolean {
  return allowedPromotions.some((rule) => rule.from === params.from && rule.to === params.to);
}
