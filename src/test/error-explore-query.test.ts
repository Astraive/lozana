import { describe, expect, it } from "vitest";
import { buildErrorExploreQuery } from "@/lib/lql/explore-query";

describe("buildErrorExploreQuery (errors page Explore action)", () => {
  it("emits the expected query for a normal service name", () => {
    expect(buildErrorExploreQuery("checkout-api")).toBe(
      'from events | where service = "checkout-api" and (level = "error" or level = "fatal") | sort timestamp desc | limit 50'
    );
  });

  it("escapes quote-based LQL injection from event-derived service names", () => {
    const payload = 'x" or 1==1 or service="y';
    const query = buildErrorExploreQuery(payload);

    // The injected quotes must remain escaped inside the single string literal;
    // no extra `where`/`or` clause may be introduced into the query.
    expect(query).toBe(
      'from events | where service = "x\\" or 1==1 or service=\\"y" and (level = "error" or level = "fatal") | sort timestamp desc | limit 50'
    );
    expect(query.match(/where service =/g)).toHaveLength(1);
    expect(query).not.toContain('service = "x" or');
  });

  it("escapes backslashes so they cannot consume the closing quote", () => {
    expect(buildErrorExploreQuery('api\\" || true')).toBe(
      'from events | where service = "api\\\\\\" || true" and (level = "error" or level = "fatal") | sort timestamp desc | limit 50'
    );
  });
});
