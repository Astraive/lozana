import { describe, it, expect, beforeEach } from "vitest";
import { useDashboardStore } from "@/stores/dashboard.store";
import { importDashboardJson } from "@/lib/storage/dashboard-storage";

function interpolate(query: string): string {
  return useDashboardStore.getState().interpolateQuery(query);
}

describe("interpolateQuery interpolation safety (LOZ-SEC-006)", () => {
  beforeEach(() => {
    useDashboardStore.setState({ variableValues: {} });
  });

  it("inserts values literally when they contain replacement-pattern `$` sequences", () => {
    // `$&` inserts the matched text when used as a string replacement.
    useDashboardStore.setState({ variableValues: { service: "$&-INJECTED" } });
    expect(interpolate("host = $service")).toBe("host = $&-INJECTED");

    // `$'`, `$``, `$1` and `$$` must also remain literal, for both token forms.
    useDashboardStore.setState({ variableValues: { svc: "$$1$'$`X" } });
    expect(interpolate("a=$svc b=${svc}")).toBe("a=$$1$'$`X b=$$1$'$`X");
  });

  it("treats regex metacharacters in variable names literally", () => {
    useDashboardStore.setState({ variableValues: { "a.b": "X" } });
    // An unescaped `.` would also match the decoy `$axb` and rewrite it.
    expect(interpolate("good $a.b decoy $axb")).toBe("good X decoy $axb");
  });

  it("escapes a catastrophic-backtracking variable name so interpolation cannot freeze", () => {
    const evilKey = "(a+)+b";
    useDashboardStore.setState({ variableValues: { [evilKey]: "SAFE" } });
    const payload = `payload = $${"a".repeat(32)}! | token = $${evilKey}`;

    const start = Date.now();
    const result = interpolate(payload);
    expect(Date.now() - start).toBeLessThan(1000);
    expect(result).toBe(`payload = $${"a".repeat(32)}! | token = SAFE`);
  });

  it("handles a malicious imported dashboard's variable name and value literally", () => {
    const imported = importDashboardJson(
      JSON.stringify({
        title: "Shared dashboard",
        panels: [{ query: "from events | where service = $svc.name" }],
        variables: [
          {
            id: "v1",
            name: "svc.name",
            label: "Service",
            type: "textbox",
            defaultValue: "$&$'",
          },
        ],
      })
    );
    const name = imported.variables[0].name;
    useDashboardStore.setState({
      variableValues: { [name]: imported.variables[0].defaultValue ?? "" },
    });

    expect(interpolate(imported.panels[0].query)).toBe(
      "from events | where service = $&$'"
    );
  });

  it("still removes `where` filters for 'all' when the variable name has metacharacters", () => {
    useDashboardStore.setState({ variableValues: { "a.b": "all" } });
    expect(interpolate('where a.b = "$a.b" | where a.b = "${a.b}"')).toBe(
      "where 1=1 | where 1=1"
    );
  });
});
