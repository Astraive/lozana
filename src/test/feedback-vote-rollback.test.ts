import { describe, expect, it } from "vitest";
import { resolveFeedbackVote } from "@/components/cortex/IncidentWorkbench";

describe("remediation feedback vote rollback", () => {
  it("does not record a vote when the submission fails", () => {
    // Regression for MASS-0884: the old code applied the vote optimistically and
    // only showed a toast on failure, leaving the button rendered as selected.
    const before = { "rem-1": "helpful" as const };
    const after = resolveFeedbackVote(before, "rem-2", "unhelpful", false);

    expect(after).toBe(before);
    expect(after).not.toHaveProperty("rem-2");
  });

  it("leaves a pre-existing vote untouched when a new submission fails", () => {
    const before = { "rem-1": "helpful" as const };
    const after = resolveFeedbackVote(before, "rem-1", "unhelpful", false);

    expect(after["rem-1"]).toBe("helpful");
  });

  it("records the vote only once the submission succeeds", () => {
    const before = { "rem-1": "helpful" as const };
    const after = resolveFeedbackVote(before, "rem-2", "unhelpful", true);

    expect(after).toEqual({ "rem-1": "helpful", "rem-2": "unhelpful" });
    expect(before).not.toHaveProperty("rem-2");
  });

  it("updates an existing vote on a successful submission", () => {
    const after = resolveFeedbackVote({ "rem-1": "helpful" }, "rem-1", "unhelpful", true);

    expect(after["rem-1"]).toBe("unhelpful");
  });
});
