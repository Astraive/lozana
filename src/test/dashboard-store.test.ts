import { describe, it, expect, afterEach } from "vitest";
import { useDashboardStore } from "@/stores/dashboard.store";

const interpolate = (query: string) => useDashboardStore.getState().interpolateQuery(query);

describe("Dashboard store: interpolateQuery", () => {
  afterEach(() => {
    useDashboardStore.setState({ variableValues: {} });
  });

  it("does not throw when a variable name contains regex metacharacters", () => {
    useDashboardStore.setState({ variableValues: { "ser[vice": "all" } });

    expect(() => interpolate('from events | where ser[vice = "$ser[vice"')).not.toThrow();
  });

  it("removes the $var where-filter for an 'all' variable with a metacharacter name", () => {
    useDashboardStore.setState({ variableValues: { "ser[vice": "all" } });

    expect(interpolate('from events | where ser[vice = "$ser[vice"')).toBe(
      "from events | where 1=1"
    );
  });

  it("removes the ${var} where-filter for an 'all' variable with a metacharacter name", () => {
    useDashboardStore.setState({ variableValues: { "ser[vice": "all" } });

    expect(interpolate('from events | where ser[vice = "${ser[vice}"')).toBe(
      "from events | where 1=1"
    );
  });

  it("still replaces $var and ${var} for a metacharacter variable name", () => {
    useDashboardStore.setState({ variableValues: { "ser[vice": "checkout" } });

    expect(
      interpolate('from events | where service = "$ser[vice" and env = "${ser[vice}"')
    ).toBe('from events | where service = "checkout" and env = "checkout"');
  });

  it("keeps ordinary variable names working", () => {
    useDashboardStore.setState({ variableValues: { service: "api", environment: "all" } });

    const result = interpolate(
      'from events | where environment = "${environment}" | where service = "$service"'
    );
    expect(result).toBe("from events | where 1=1 | where service = \"api\"");
  });

  it("drops an 'all' variable filter inside a compound AND predicate", () => {
    useDashboardStore.setState({ variableValues: { service: "all" } });

    expect(interpolate('from events | where level = "error" and service = "$service"')).toBe(
      'from events | where level = "error" and 1=1'
    );
  });

  it("drops an 'all' variable filter when it leads a compound AND predicate", () => {
    useDashboardStore.setState({ variableValues: { service: "all" } });

    expect(interpolate('from events | where service = "$service" and level = "error"')).toBe(
      'from events | where 1=1 and level = "error"'
    );
  });

  it("drops a wrapped ${var} 'all' filter inside a compound OR predicate", () => {
    useDashboardStore.setState({ variableValues: { service: "all" } });

    expect(interpolate('from events | where level = "error" or service = "${service}"')).toBe(
      'from events | where level = "error" or 1=1'
    );
  });
});
