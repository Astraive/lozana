import { describe, expect, it } from "vitest";
import { resolveVariableValue } from "@/lib/dashboard/variable-value";

const textboxVariable = {
  name: "service",
  defaultValue: "checkout",
  includeAll: false,
};

describe("dashboard variable value resolution", () => {
  it("preserves a cleared (empty) value even when a default exists", () => {
    // Regression for MASS-0888: `variableValues[v.name] || v.defaultValue`
    // treated "" as absent, so clearing a textbox snapped back to "checkout"
    // and an empty value could never be submitted.
    expect(resolveVariableValue(textboxVariable, { service: "" })).toBe("");
  });

  it("uses a stored non-empty value over the default", () => {
    expect(resolveVariableValue(textboxVariable, { service: "payment-api" })).toBe("payment-api");
  });

  it("falls back to the default when no value is stored", () => {
    expect(resolveVariableValue(textboxVariable, {})).toBe("checkout");
  });

  it('falls back to "all" for an includeAll variable with no stored or default value', () => {
    expect(resolveVariableValue({ name: "env", includeAll: true }, {})).toBe("all");
  });

  it("falls back to an empty string when there is no value, default, or includeAll", () => {
    expect(resolveVariableValue({ name: "env" }, {})).toBe("");
  });

  it("does not replace an explicitly empty default with the includeAll fallback", () => {
    expect(resolveVariableValue({ name: "env", defaultValue: "", includeAll: true }, {})).toBe("");
  });
});
