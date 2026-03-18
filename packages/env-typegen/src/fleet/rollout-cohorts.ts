import type { PromotionStage } from "../ops/concurrency-orchestrator.js";

export type FleetRolloutCohortName = "canary" | "ramp" | "global";

export type FleetRolloutCohort = {
  name: FleetRolloutCohortName;
  position: number;
  maxConcurrency: number;
  description: string;
};

const DEFAULT_FLEET_ROLLOUT_COHORTS: readonly FleetRolloutCohort[] = [
  {
    name: "canary",
    position: 0,
    maxConcurrency: 1,
    description: "Smallest blast radius for first governance rollout checks.",
  },
  {
    name: "ramp",
    position: 1,
    maxConcurrency: 2,
    description: "Broader rollout after canary stability is confirmed.",
  },
  {
    name: "global",
    position: 2,
    maxConcurrency: Number.POSITIVE_INFINITY,
    description: "Full fleet rollout once all gates remain healthy.",
  },
] as const;

const CANARY_COHORT: FleetRolloutCohort = {
  name: "canary",
  position: 0,
  maxConcurrency: 1,
  description: "Smallest blast radius for first governance rollout checks.",
};

const RAMP_COHORT: FleetRolloutCohort = {
  name: "ramp",
  position: 1,
  maxConcurrency: 2,
  description: "Broader rollout after canary stability is confirmed.",
};

const GLOBAL_COHORT: FleetRolloutCohort = {
  name: "global",
  position: 2,
  maxConcurrency: Number.POSITIVE_INFINITY,
  description: "Full fleet rollout once all gates remain healthy.",
};

function cloneFleetRolloutCohort(cohort: FleetRolloutCohort): FleetRolloutCohort {
  return {
    name: cohort.name,
    position: cohort.position,
    maxConcurrency: cohort.maxConcurrency,
    description: cohort.description,
  };
}

export function listFleetRolloutCohorts(): FleetRolloutCohort[] {
  return DEFAULT_FLEET_ROLLOUT_COHORTS.map((cohort) => cloneFleetRolloutCohort(cohort));
}

export function resolveFleetRolloutCohortForStage(stage: PromotionStage): FleetRolloutCohort {
  switch (stage) {
    case "advisory":
      return cloneFleetRolloutCohort(CANARY_COHORT);
    case "enforce":
      return cloneFleetRolloutCohort(RAMP_COHORT);
    case "apply":
      return cloneFleetRolloutCohort(GLOBAL_COHORT);
    default:
      return cloneFleetRolloutCohort(CANARY_COHORT);
  }
}

export function getNextFleetRolloutCohort(
  current: FleetRolloutCohortName,
): FleetRolloutCohortName | null {
  const cohorts = DEFAULT_FLEET_ROLLOUT_COHORTS;
  const currentIndex = cohorts.findIndex((cohort) => cohort.name === current);
  if (currentIndex < 0 || currentIndex >= cohorts.length - 1) {
    return null;
  }

  return cohorts[currentIndex + 1]?.name ?? null;
}
