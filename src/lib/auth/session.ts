/**
 * Browser session storage for bearer tokens.
 *
 * Token-storage policy (documented in README under "Token storage policy"):
 * - Session data lives ONLY in sessionStorage. It is never written to localStorage.
 * - sessionStorage is scoped to the current tab and is cleared when that tab closes.
 * - A session is valid only while `expiresAt` is a parseable, future timestamp.
 *   Reads fail closed: a missing, malformed, or past expiry is rejected and cleared.
 */

export interface Session {
  token?: string;
  user?: {
    id: string;
    name: string;
    email?: string;
  };
  /** ISO-8601 (or otherwise Date-parseable) timestamp after which the session is invalid. */
  expiresAt?: string;
}

const SESSION_KEY = "lozana:session";

/** Return sessionStorage when available, otherwise null (SSR or blocked storage). */
function getStorage(): Storage | null {
  try {
    return typeof sessionStorage === "undefined" ? null : sessionStorage;
  } catch {
    return null;
  }
}

/** Fail-closed validity check: only a session with a future, parseable expiry is active. */
function isActive(session: Session | null | undefined): session is Session {
  if (!session || typeof session.expiresAt !== "string") return false;
  const expiresAt = Date.parse(session.expiresAt);
  return Number.isFinite(expiresAt) && expiresAt > Date.now();
}

/**
 * Retrieve the current session.
 *
 * Returns null when there is no session, storage is unavailable, or the session
 * is expired/invalid. Expired or invalid sessions are removed from sessionStorage.
 * Tokens are read from sessionStorage only — localStorage is never consulted.
 */
export function getSession(): Session | null {
  const storage = getStorage();
  if (!storage) return null;

  let session: Session | null = null;
  try {
    const raw = storage.getItem(SESSION_KEY);
    if (raw === null) return null;
    session = JSON.parse(raw) as Session;
  } catch {
    // Corrupt payload — treated as no session and cleared below.
  }

  if (!isActive(session)) {
    try {
      storage.removeItem(SESSION_KEY);
    } catch {
      // Storage blocked; nothing else we can do.
    }
    return null;
  }
  return session;
}

/**
 * Persist a session in sessionStorage, or clear it when `session` is null.
 *
 * Expired/invalid sessions are not persisted, and localStorage is never touched.
 */
export function setSession(session: Session | null): void {
  const storage = getStorage();
  if (!storage) return;

  try {
    if (session === null || !isActive(session)) {
      storage.removeItem(SESSION_KEY);
      return;
    }
    storage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    // Storage full or blocked — fail closed so no stale session survives.
    try {
      storage.removeItem(SESSION_KEY);
    } catch {
      // Ignore.
    }
  }
}
