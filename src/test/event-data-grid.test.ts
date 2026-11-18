import { describe, expect, it, vi } from "vitest";
import { getEventRowId } from "@/components/explorer/EventDataGrid";

describe("EventDataGrid copy-success feedback id", () => {
  it("uses the row index as a stable id when the event has no event_id", () => {
    const event = { service: "checkout", message: "no id here" };

    // The rendered row id and the id set by the copy handler are both derived
    // from this helper, so they must agree for id-less events.
    expect(getEventRowId(event, 3)).toBe("3");
    expect(getEventRowId(event, 3)).toBe(getEventRowId(event, 3));
  });

  it("does not depend on Math.random for id-less events", () => {
    const random = vi.spyOn(Math, "random").mockReturnValue(0.123456789);
    try {
      const event = { service: "payments" };
      // Previously copyEventJson used `String(event.event_id || Math.random())`,
      // which could never equal the rendered `String(evt.event_id || idx)`.
      expect(getEventRowId(event, 7)).toBe("7");
    } finally {
      random.mockRestore();
    }
  });

  it("prefers a real event_id when one is present", () => {
    expect(getEventRowId({ event_id: "evt-42" }, 1)).toBe("evt-42");
  });
});
