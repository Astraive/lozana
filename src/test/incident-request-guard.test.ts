import { describe, expect, it } from "vitest";
import { RequestGuard } from "@/lib/incident-request-guard";

describe("incident load request guard", () => {
  it("ignores a stale response that resolves after a newer request started", async () => {
    const guard = new RequestGuard();
    const applied: string[] = [];

    // Models loadIncident: each load tags its Promise.all with a token and only
    // writes state while that token is still current.
    const load = (incidentId: string, delayMs: number): Promise<void> => {
      const token = guard.begin();
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          if (guard.isCurrent(token)) applied.push(incidentId);
          resolve();
        }, delayMs);
      });
    };

    const oldIncident = load("incident-old", 20); // slow, started first
    const newIncident = load("incident-new", 5); // fast, started second
    await Promise.all([oldIncident, newIncident]);

    // Without the guard the older, slower response would resolve last and
    // overwrite the newer incident's data.
    expect(applied).toEqual(["incident-new"]);
  });

  it("invalidates an in-flight request on effect cleanup", () => {
    const guard = new RequestGuard();
    const token = guard.begin();

    expect(guard.isCurrent(token)).toBe(true);

    // Cleanup (URL change / unmount) marks the outstanding request as stale.
    guard.invalidate();
    expect(guard.isCurrent(token)).toBe(false);
  });

  it("accepts a fresh request after cleanup without discarding its result", () => {
    const guard = new RequestGuard();
    const stale = guard.begin();
    guard.invalidate();

    const fresh = guard.begin();
    expect(guard.isCurrent(stale)).toBe(false);
    expect(guard.isCurrent(fresh)).toBe(true);
  });
});
