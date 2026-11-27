/**
 * Small, framework-agnostic helpers shared by the UI interaction fixes.
 * Keeping these pure makes the acceptance-criteria behaviours unit-testable
 * without a DOM test environment.
 */

/** Run handlers in order so a consumer handler can never replace an internal one. */
export function chainEventHandlers<E>(
  ...handlers: Array<((event: E) => void) | undefined>
): (event: E) => void {
  return (event) => {
    for (const handler of handlers) handler?.(event)
  }
}

/** Lock scrolling on an element, restoring its previous overflow on release. */
export function createScrollLock(
  element: { style: { overflow: string } } = document.body
): () => void {
  const previousOverflow = element.style.overflow
  element.style.overflow = "hidden"
  let released = false
  return () => {
    if (released) return
    released = true
    element.style.overflow = previousOverflow
  }
}

/** Next index for arrow-key navigation with wraparound. -1 means "nothing focused". */
export function getArrowKeyIndex(
  key: string,
  currentIndex: number,
  count: number
): number {
  if (count <= 0) return 0
  const step =
    key === "ArrowDown" || key === "ArrowRight"
      ? 1
      : key === "ArrowUp" || key === "ArrowLeft"
      ? -1
      : 0
  if (step === 0) return currentIndex
  if (currentIndex < 0) return step > 0 ? 0 : count - 1
  return (currentIndex + step + count) % count
}

/** Recognise the Cmd/Ctrl+K command-palette shortcut. */
export function isCommandPaletteShortcut(
  event: Pick<KeyboardEvent, "key" | "metaKey" | "ctrlKey">
): boolean {
  return (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k"
}

/** Generic, non-sensitive message for the error boundary fallback. */
export function getPublicErrorMessage(_error?: unknown): string {
  void _error
  return "Something went wrong. Please try again."
}

/** Whether a caught error boundary should clear its error state. */
export function shouldResetErrorBoundary(
  prevChildren: unknown,
  children: unknown,
  prevResetKey: unknown,
  resetKey: unknown
): boolean {
  return prevChildren !== children || prevResetKey !== resetKey
}
