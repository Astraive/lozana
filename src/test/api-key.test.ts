import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { fetchJSON, getApiKey } from "@/lib/api/client";
import { getApiKey as getEnvApiKey } from "@/lib/env";
import { getAuthHeaders, isAuthenticated } from "@/lib/auth/auth.client";
import { useAppStore } from "@/stores/app.store";

function createMemoryStorage(): Storage {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    clear() {
      data.clear();
    },
    getItem(key) {
      return data.has(key) ? (data.get(key) as string) : null;
    },
    key(index) {
      return Array.from(data.keys())[index] ?? null;
    },
    removeItem(key) {
      data.delete(key);
    },
    setItem(key, value) {
      data.set(key, String(value));
    },
  };
}

function snapshot(storage: Storage): Record<string, string> {
  const out: Record<string, string> = {};
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (key !== null) out[key] = storage.getItem(key) ?? "";
  }
  return out;
}

describe("API key getter", () => {
  let local: Storage;
  let session: Storage;

  beforeEach(() => {
    local = createMemoryStorage();
    session = createMemoryStorage();
    vi.stubGlobal("localStorage", local);
    vi.stubGlobal("sessionStorage", session);
    useAppStore.setState({ apiKey: "", activeCollector: "", activeEnvironment: "all" });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("exposes exactly one getApiKey implementation", () => {
    expect(getEnvApiKey).toBe(getApiKey);
  });

  it("reading the key never mutates storage", () => {
    session.setItem("loza-api-key", "lz_pure_read");
    local.setItem("loza-api-key", "legacy_key");
    const localBefore = snapshot(local);
    const sessionBefore = snapshot(session);

    expect(getApiKey()).toBe("lz_pure_read");
    expect(getEnvApiKey()).toBe("lz_pure_read");
    expect(getAuthHeaders()).toEqual({ Authorization: "Bearer lz_pure_read" });
    expect(isAuthenticated()).toBe(true);

    expect(snapshot(local)).toEqual(localBefore);
    expect(snapshot(session)).toEqual(sessionBefore);
    expect(local.getItem("loza-api-key")).toBe("legacy_key");
  });

  it("keeps auth state and API request headers consistent", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    } as Response);

    session.setItem("loza-api-key", "lz_shared_key");
    expect(isAuthenticated()).toBe(true);

    await fetchJSON("/health");
    const headers = new Headers(fetchMock.mock.calls[0]?.[1]?.headers);
    expect(headers.get("Authorization")).toBe("Bearer lz_shared_key");

    session.removeItem("loza-api-key");
    expect(isAuthenticated()).toBe(false);
    await fetchJSON("/health");
    const unauthHeaders = new Headers(fetchMock.mock.calls[1]?.[1]?.headers);
    expect(unauthHeaders.has("Authorization")).toBe(false);
  });

  it("never throws when storage access is blocked", () => {
    const blocked = {
      get length() {
        throw new Error("blocked");
      },
      clear() {
        throw new Error("blocked");
      },
      getItem() {
        throw new Error("blocked");
      },
      key() {
        throw new Error("blocked");
      },
      removeItem() {
        throw new Error("blocked");
      },
      setItem() {
        throw new Error("blocked");
      },
    } as Storage;
    vi.stubGlobal("localStorage", blocked);
    vi.stubGlobal("sessionStorage", blocked);

    expect(() => getApiKey()).not.toThrow();
    expect(getApiKey()).toBe("");
    expect(() => isAuthenticated()).not.toThrow();
    expect(isAuthenticated()).toBe(false);
    expect(() => useAppStore.getState().setApiKey("lz_key")).not.toThrow();
  });

  it("never throws in SSR/non-browser contexts", () => {
    vi.stubGlobal("localStorage", undefined);
    vi.stubGlobal("sessionStorage", undefined);

    expect(() => getApiKey()).not.toThrow();
    expect(getApiKey()).toBe("");
    expect(() => getAuthHeaders()).not.toThrow();
    expect(getAuthHeaders()).toEqual({});
  });
});
