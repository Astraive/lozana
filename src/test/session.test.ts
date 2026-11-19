import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { getSession, setSession, type Session } from "@/lib/auth/session";

const SESSION_KEY = "lozana:session";

function createMemoryStorage(): Storage {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (key: string) => (data.has(key) ? data.get(key)! : null),
    key: (index: number) => [...data.keys()][index] ?? null,
    removeItem: (key: string) => {
      data.delete(key);
    },
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
  };
}

const futureExpiry = () => new Date(Date.now() + 60_000).toISOString();
const pastExpiry = () => new Date(Date.now() - 60_000).toISOString();

describe("Session token storage", () => {
  let localStorageMock: Storage;
  let sessionStorageMock: Storage;

  beforeEach(() => {
    localStorageMock = createMemoryStorage();
    sessionStorageMock = createMemoryStorage();
    vi.stubGlobal("localStorage", localStorageMock);
    vi.stubGlobal("sessionStorage", sessionStorageMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("writes tokens to sessionStorage only, never to localStorage", () => {
    const session: Session = {
      token: "lz_secret_abc123",
      user: { id: "u1", name: "Ada", email: "ada@example.com" },
      expiresAt: futureExpiry(),
    };

    setSession(session);

    expect(sessionStorageMock.getItem(SESSION_KEY)).toContain("lz_secret_abc123");
    expect(localStorageMock.length).toBe(0);
    expect(localStorageMock.getItem(SESSION_KEY)).toBeNull();
    expect(getSession()).toEqual(session);
  });

  it("rejects and clears an expired session on read", () => {
    sessionStorageMock.setItem(
      SESSION_KEY,
      JSON.stringify({ token: "lz_secret_expired", expiresAt: pastExpiry() })
    );

    expect(getSession()).toBeNull();
    expect(sessionStorageMock.getItem(SESSION_KEY)).toBeNull();
    expect(localStorageMock.getItem(SESSION_KEY)).toBeNull();
  });

  it("fails closed when expiresAt is missing, malformed, or not a string", () => {
    const invalidSessions = [
      { token: "lz_secret_no_expiry" },
      { token: "lz_secret_bad_expiry", expiresAt: "not-a-date" },
      { token: "lz_secret_null_expiry", expiresAt: null },
    ];

    for (const invalid of invalidSessions) {
      sessionStorageMock.setItem(SESSION_KEY, JSON.stringify(invalid));
      expect(getSession()).toBeNull();
      expect(sessionStorageMock.getItem(SESSION_KEY)).toBeNull();
    }
    expect(localStorageMock.getItem(SESSION_KEY)).toBeNull();
  });

  it("does not persist an already-expired session passed to setSession", () => {
    setSession({ token: "lz_secret_expired", expiresAt: pastExpiry() });

    expect(sessionStorageMock.getItem(SESSION_KEY)).toBeNull();
    expect(localStorageMock.length).toBe(0);
    expect(getSession()).toBeNull();
  });

  it("clears the stored session when setSession(null) is called", () => {
    setSession({ token: "lz_secret_abc123", expiresAt: futureExpiry() });
    expect(sessionStorageMock.getItem(SESSION_KEY)).not.toBeNull();

    setSession(null);

    expect(sessionStorageMock.getItem(SESSION_KEY)).toBeNull();
    expect(localStorageMock.getItem(SESSION_KEY)).toBeNull();
    expect(getSession()).toBeNull();
  });

  it("rejects and clears a corrupt stored payload", () => {
    sessionStorageMock.setItem(SESSION_KEY, "{not valid json");

    expect(getSession()).toBeNull();
    expect(sessionStorageMock.getItem(SESSION_KEY)).toBeNull();
  });

  it("is a no-op when Web Storage is unavailable (e.g. SSR)", () => {
    vi.stubGlobal("sessionStorage", undefined);
    vi.stubGlobal("localStorage", undefined);

    expect(getSession()).toBeNull();
    expect(() => setSession({ token: "lz_secret_abc123", expiresAt: futureExpiry() })).not.toThrow();
  });

  it("treats an expiry at the current time as expired", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
    sessionStorageMock.setItem(
      SESSION_KEY,
      JSON.stringify({ token: "lz_secret_edge", expiresAt: "2026-01-01T00:00:00.000Z" })
    );

    expect(getSession()).toBeNull();
    expect(sessionStorageMock.getItem(SESSION_KEY)).toBeNull();
  });
});
