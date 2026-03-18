import { describe, expect, it } from "vitest";

import {
  getGovernanceTemplate,
  isFleetEnforcementLevel,
  isFleetPolicyChannel,
  isGovernanceTemplateId,
  listGovernanceTemplates,
} from "../../src/templates/governance-template.js";

describe("governance template catalog", () => {
  it("should expose deterministic built-in templates", () => {
    const templates = listGovernanceTemplates();

    expect(templates).toHaveLength(2);
    expect(templates.map((template) => template.id)).toEqual(["web-app", "library"]);
  });

  it("should resolve web-app defaults", () => {
    const template = getGovernanceTemplate("web-app");

    expect(template.defaults.stage).toBe("enforce");
    expect(template.defaults.enforcementLevel).toBe("strict");
    expect(template.defaults.policyChannel).toBe("stage");
  });

  it("should validate supported type guards", () => {
    expect(isGovernanceTemplateId("web-app")).toBe(true);
    expect(isGovernanceTemplateId("invalid")).toBe(false);
    expect(isFleetEnforcementLevel("advisory")).toBe(true);
    expect(isFleetEnforcementLevel("invalid")).toBe(false);
    expect(isFleetPolicyChannel("prod")).toBe(true);
    expect(isFleetPolicyChannel("invalid")).toBe(false);
  });
});
