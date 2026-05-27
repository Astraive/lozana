/**
 * Typed localStorage getter.
 */
export function getItem<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return null;
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
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or blocked
  }
}

/**
 * Remove an item from localStorage.
 */
export function removeItem(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // Ignore
  }
}
