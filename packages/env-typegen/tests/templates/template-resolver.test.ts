import { describe, expect, it } from "vitest";

import { resolveGovernanceTemplate } from "../../src/templates/template-resolver.js";

describe("template resolver", () => {
  it("should resolve default values from selected template", () => {
    const resolved = resolveGovernanceTemplate({ template: "library" });

    expect(resolved.template).toBe("library");
    expect(resolved.stage).toBe("advisory-enforce");
    expect(resolved.enforcementLevel).toBe("standard");
    expect(resolved.policyChannel).toBe("dev");
  });

  it("should prioritize overlay values", () => {
    const resolved = resolveGovernanceTemplate({
      template: "web-app",
      overlay: {
        stage: "apply",
        enforcementLevel: "advisory",
        policyChannel: "prod",
      },
    });

    expect(resolved.template).toBe("web-app");
    expect(resolved.stage).toBe("apply");
    expect(resolved.enforcementLevel).toBe("advisory");
    expect(resolved.policyChannel).toBe("prod");
  });
});
