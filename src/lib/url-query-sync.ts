export interface UrlQuerySyncArgs {
  /** The `?q=` value supplied by the current navigation. */
  urlQuery: string;
  /** The query currently stored in the active tab. */
  activeQuery: string;
  /** The last `?q=` value that was already reconciled with a tab. */
  lastSyncedUrlQuery: string | null;
}

export interface UrlQuerySyncResult {
  /** Store this back in the caller's ref so the same value is not applied twice. */
  lastSyncedUrlQuery: string | null;
  /** Non-null only when the active tab must be overwritten by the URL. */
  queryToApply: string | null;
}

/**
 * Decide whether a `?q=` navigation should be written into the active tab.
 *
 * Only a change to `urlQuery` may trigger a write. Active-tab edits (typing in
 * the editor, switching tabs, applying snippets/filters) change `activeQuery`
 * but leave `urlQuery` untouched, so they must never be reverted to a stale URL
 * value. Callers keep `lastSyncedUrlQuery` in a ref and do not re-run this
 * decision when `activeQuery` changes.
 */
export function resolveUrlQuerySync({
  urlQuery,
  activeQuery,
  lastSyncedUrlQuery,
}: UrlQuerySyncArgs): UrlQuerySyncResult {
  if (urlQuery === lastSyncedUrlQuery) {
    return { lastSyncedUrlQuery, queryToApply: null };
  }

  return {
    lastSyncedUrlQuery: urlQuery,
    queryToApply: urlQuery && urlQuery !== activeQuery ? urlQuery : null,
  };
}
