import { describe, expect, it, vi } from "vitest";
import { writeTextWithFeedback } from "@/lib/clipboard";

describe("writeTextWithFeedback (EventDetailDrawer clipboard flow)", () => {
  it("emits success feedback only after the clipboard write resolves", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    const onSuccess = vi.fn();
    const onError = vi.fn();

    await writeTextWithFeedback("payload", "json", { writeText }, { onSuccess, onError });

    expect(writeText).toHaveBeenCalledWith("payload");
    expect(onSuccess).toHaveBeenCalledWith("json");
    expect(onError).not.toHaveBeenCalled();
  });

  it("does NOT emit success feedback when the clipboard write rejects", async () => {
    // Regression for MASS-0897 / issue #33: the drawer used to set copiedKey and
    // call toast.success unconditionally, so a failed copy still looked successful.
    const writeText = vi.fn().mockRejectedValue(new Error("permission denied"));
    const onSuccess = vi.fn();
    const onError = vi.fn();

    await writeTextWithFeedback("payload", "json", { writeText }, { onSuccess, onError });

    expect(onSuccess).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledOnce();
  });

  it("does not swallow the written text when reporting success", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);

    await writeTextWithFeedback(
      "line1\nline2",
      "stack",
      { writeText },
      { onSuccess: vi.fn(), onError: vi.fn() },
    );

    expect(writeText).toHaveBeenCalledExactlyOnceWith("line1\nline2");
  });
});
