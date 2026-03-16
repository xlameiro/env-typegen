import type { EnvVarType } from "../parser/types.js";
import type { InferenceRule } from "./rules.js";
import { inferenceRules } from "./rules.js";

type InferTypeOptions = {
  fallbackType?: EnvVarType;
  /**
   * Additional rules to check before the built-in rules.
   * Within extraRules, lower priority number = higher precedence.
   */
  extraRules?: InferenceRule[];
};

const sortedRules = [...inferenceRules].sort((left, right) => left.priority - right.priority);

export function inferType(key: string, value: string, options?: InferTypeOptions): EnvVarType {
  const extra = options?.extraRules;
  const rules =
    extra && extra.length > 0
      ? [...extra].sort((a, b) => a.priority - b.priority).concat(sortedRules)
      : sortedRules;

  for (const rule of rules) {
    if (rule.match(key, value)) {
      return rule.type;
    }
  }

  return options?.fallbackType ?? "string";
}

export function inferTypesFromParsedVars(
  parsed: { vars: Array<{ key: string; rawValue: string }> },
  options?: InferTypeOptions,
): EnvVarType[] {
  return parsed.vars.map((item) => inferType(item.key, item.rawValue, options));
}
