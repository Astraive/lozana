/**
 * Minimal Clipboard surface the UI depends on. Injected so the copy flow can be
 * exercised in tests without a real browser Clipboard API.
 */
export interface ClipboardWriter {
  writeText(text: string): Promise<void>;
}

export interface CopyFeedback {
  onSuccess: (key: string) => void;
  onError: () => void;
}

/**
 * Writes `text` to the clipboard and reports the outcome through `feedback`.
 * Success feedback is only emitted after `writeText` resolves; a rejected write
 * (permission denied, insecure context, etc.) yields error feedback instead.
 */
export async function writeTextWithFeedback(
  text: string,
  key: string,
  writer: ClipboardWriter,
  feedback: CopyFeedback,
): Promise<void> {
  try {
    await writer.writeText(text);
    feedback.onSuccess(key);
  } catch {
    feedback.onError();
  }
}
