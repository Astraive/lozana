import { describe, expect, it } from "vitest";
import { copyTextToClipboard } from "@/components/cortex/IncidentWorkbench";

describe("copyTextToClipboard", () => {
  it("reports success only after the clipboard write resolves", async () => {
    let resolveWrite!: () => void;
    const writeText = () => new Promise<void>((resolve) => { resolveWrite = resolve; });

    const result = copyTextToClipboard("kubectl get pods", writeText);

    // The write is still pending, so success must not have been reported yet.
    let settled = false;
    void result.then(() => { settled = true; });
    await Promise.resolve();
    expect(settled).toBe(false);

    resolveWrite();
    await expect(result).resolves.toBe(true);
  });

  it("reports failure when the clipboard write rejects", async () => {
    const result = await copyTextToClipboard(
      "kubectl get pods",
      () => Promise.reject(new Error("permission denied"))
    );

    expect(result).toBe(false);
  });

  it("reports failure when clipboard access throws synchronously", async () => {
    const result = await copyTextToClipboard("kubectl get pods", () => {
      throw new Error("clipboard unavailable");
    });

    expect(result).toBe(false);
  });
});
