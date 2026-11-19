type StorageKind = "local" | "session";

/**
 * Resolve a web storage backend without throwing.
 *
 * Access can fail in SSR/non-browser contexts (undefined global) and in
 * browsers that block storage (private mode, sandboxed iframes, disabled
 * cookies). Both cases degrade to `null` so callers can treat storage as
 * optional.
 */
function getStorage(kind: StorageKind): Storage | null {
  try {
    const store = kind === "local" ? globalThis.localStorage : globalThis.sessionStorage;
    return typeof store === "undefined" ? null : store;
  } catch {
    return null;
  }
}

/** Read a raw string from localStorage/sessionStorage without throwing. */
export function readStoredValue(key: string, kind: StorageKind = "local"): string | null {
  try {
    return getStorage(kind)?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

/** Persist a raw string to localStorage/sessionStorage without throwing. */
export function writeStoredValue(key: string, value: string, kind: StorageKind = "local"): void {
  try {
    getStorage(kind)?.setItem(key, value);
  } catch {
    // Storage full or blocked
  }
}

/** Remove a key from localStorage/sessionStorage without throwing. */
export function clearStoredValue(key: string, kind: StorageKind = "local"): void {
  try {
    getStorage(kind)?.removeItem(key);
  } catch {
    // Ignore
  }
}

/**
 * Typed localStorage getter.
 */
export function getItem<T>(key: string): T | null {
  const raw = readStoredValue(key);
  if (raw === null) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/**
 * Typed localStorage setter.
 */
export function setItem<T>(key: string, value: T): void {
  try {
    writeStoredValue(key, JSON.stringify(value));
  } catch {
    // Non-serializable value
  }
}

/**
 * Remove an item from localStorage.
 */
export function removeItem(key: string): void {
  clearStoredValue(key);
}
