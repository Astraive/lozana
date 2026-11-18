import { describe, expect, it, vi } from "vitest";
import { copySpanText } from "@/components/traces/SpanDetailPanel";

describe("SpanDetailPanel clipboard copy", () => {
  it("reports success only after the clipboard write resolves", async () => {
    let resolveWrite!: () => void;
    const writeText = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveWrite = resolve;
        })
    );
    const onSuccess = vi.fn();
    const onError = vi.fn();

    const result = copySpanText("payload", { clipboard: { writeText }, onSuccess, onError });

    // The write is still pending: no success may be reported yet.
    expect(writeText).toHaveBeenCalledWith("payload");
    expect(onSuccess).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();

    resolveWrite();
    await expect(result).resolves.toBe(true);
    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(onError).not.toHaveBeenCalled();
  });

  it("reports an error and never reports success when the write rejects", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("permission denied"));
    const onSuccess = vi.fn();
    const onError = vi.fn();

    await expect(
      copySpanText("payload", { clipboard: { writeText }, onSuccess, onError })
    ).resolves.toBe(false);
    expect(onSuccess).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it("reports an error without throwing when the clipboard API is unavailable", async () => {
    const onSuccess = vi.fn();
    const onError = vi.fn();

    await expect(
      copySpanText("payload", { clipboard: undefined, onSuccess, onError })
    ).resolves.toBe(false);
    expect(onSuccess).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it("reports an error when writeText is missing (non-secure context)", async () => {
    const onSuccess = vi.fn();
    const onError = vi.fn();

    await expect(
      copySpanText("payload", { clipboard: {}, onSuccess, onError })
    ).resolves.toBe(false);
    expect(onSuccess).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledTimes(1);
  });
});
