import { describe, expect, it } from "vitest";
import { formatMetricValue } from "@/lib/format";

describe("collector metric rendering", () => {
  it("renders a zero metric value as '0' rather than the missing-data fallback", () => {
    // Regression for MASS-0970: truthiness checks rendered a valid 0 as "—".
    expect(formatMetricValue(0, "—")).toBe("0");
    expect(formatMetricValue(0, "0")).toBe("0");
  });

  it("renders zero consistently across all four health summary metrics", () => {
    const metrics = {
      events_ingested: 0,
      events_accepted: 0,
      events_quarantined: 0,
      dlq_size: 0,
    };

    const rendered = [
      formatMetricValue(metrics.events_ingested, "—"),
      formatMetricValue(metrics.events_accepted, "—"),
      formatMetricValue(metrics.events_quarantined, "0"),
      formatMetricValue(metrics.dlq_size, "0"),
    ];

    expect(rendered).toEqual(["0", "0", "0", "0"]);
  });

  it("uses the missing-data fallback only for nullish values", () => {
    expect(formatMetricValue(undefined, "—")).toBe("—");
    expect(formatMetricValue(null, "—")).toBe("—");
    expect(formatMetricValue(undefined, "0")).toBe("0");
    expect(formatMetricValue(null, "0")).toBe("0");
  });

  it("keeps locale-aware formatting for non-zero values", () => {
    expect(formatMetricValue(1234567, "—")).toBe((1234567).toLocaleString());
  });
});
