import { describe, expect, it } from "vitest";
import { resolveUrlQuerySync } from "@/lib/url-query-sync";

const NAV_QUERY = "from events | limit 100";

/** The previous effect re-ran on `activeQuery` and wrote the stale URL back. */
function legacyWriteBack(urlQuery: string, activeQuery: string): string | null {
  return urlQuery && urlQuery !== activeQuery ? urlQuery : null;
}

describe("URL query -> active tab sync", () => {
  it("applies a query supplied by navigation on the first sync", () => {
    expect(
      resolveUrlQuerySync({
        urlQuery: NAV_QUERY,
        activeQuery: "from events",
        lastSyncedUrlQuery: null,
      })
    ).toEqual({ lastSyncedUrlQuery: NAV_QUERY, queryToApply: NAV_QUERY });
  });

  it("does not clobber an active-tab edit while the URL query is unchanged", () => {
    const edited = 'from events | where level = "error"';
    // Regression contrast: the old dependency on `activeQuery` reverted typing.
    expect(legacyWriteBack(NAV_QUERY, edited)).toBe(NAV_QUERY);

    expect(
      resolveUrlQuerySync({
        urlQuery: NAV_QUERY,
        activeQuery: edited,
        lastSyncedUrlQuery: NAV_QUERY,
      }).queryToApply
    ).toBeNull();
  });

  it("does not destroy a newly switched tab's own query", () => {
    const otherTabQuery = "from events | where service = 'api'";
    expect(
      resolveUrlQuerySync({
        urlQuery: NAV_QUERY,
        activeQuery: otherTabQuery,
        lastSyncedUrlQuery: NAV_QUERY,
      }).queryToApply
    ).toBeNull();
  });

  it("applies a genuinely new URL query after previous edits", () => {
    const nextQuery = "from events | limit 5";
    expect(
      resolveUrlQuerySync({
        urlQuery: nextQuery,
        activeQuery: "partially typed",
        lastSyncedUrlQuery: NAV_QUERY,
      })
    ).toEqual({ lastSyncedUrlQuery: nextQuery, queryToApply: nextQuery });
  });

  it("never writes an empty URL query back into the tab", () => {
    expect(
      resolveUrlQuerySync({
        urlQuery: "",
        activeQuery: NAV_QUERY,
        lastSyncedUrlQuery: null,
      })
    ).toEqual({ lastSyncedUrlQuery: "", queryToApply: null });
  });

  it("marks an already-matching URL query as synced without a redundant write", () => {
    expect(
      resolveUrlQuerySync({
        urlQuery: NAV_QUERY,
        activeQuery: NAV_QUERY,
        lastSyncedUrlQuery: null,
      })
    ).toEqual({ lastSyncedUrlQuery: NAV_QUERY, queryToApply: null });
  });
});
