import { describe, expect, it } from "vitest";
import {
  buildServiceExploreHref,
  buildServiceExploreQuery,
} from "@/lib/lql/explore-links";

const HREF_PREFIX = "/explore?q=";

describe("service explore links", () => {
  it("builds the expected query for a normal service name", () => {
    expect(buildServiceExploreQuery("checkout")).toBe(
      'from events | where service = "checkout" | sort timestamp desc | limit 100',
    );
  });

  it("escapes a quote so a service name cannot inject query clauses", () => {
    const hostileName = 'api" | sort timestamp asc';

    // With raw interpolation the name would break out of the string literal and
    // append an attacker-controlled `| sort ...` clause. After the fix the
    // quote is escaped and the text stays inside the single service literal.
    expect(buildServiceExploreQuery(hostileName)).toBe(
      String.raw`from events | where service = "api\" | sort timestamp asc" | sort timestamp desc | limit 100`,
    );
  });

  it("escapes backslashes in service names", () => {
    expect(buildServiceExploreQuery(String.raw`api\gateway`)).toBe(
      String.raw`from events | where service = "api\\gateway" | sort timestamp desc | limit 100`,
    );
  });

  it("URL-encodes the escaped query into the /explore deep link", () => {
    const href = buildServiceExploreHref('api" | sort timestamp asc');
    expect(href.startsWith(HREF_PREFIX)).toBe(true);
    expect(decodeURIComponent(href.slice(HREF_PREFIX.length))).toBe(
      String.raw`from events | where service = "api\" | sort timestamp asc" | sort timestamp desc | limit 100`,
    );
  });

  it("preserves trusted extra clauses and custom limits for the errors view", () => {
    expect(
      buildServiceExploreQuery("checkout", {
        extraWhere: ' and (level = "error" or level = "fatal")',
        limit: 50,
      }),
    ).toBe(
      'from events | where service = "checkout" and (level = "error" or level = "fatal") | sort timestamp desc | limit 50',
    );
  });
});
