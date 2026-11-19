// @vitest-environment jsdom
import * as React from "react"
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { CopyButton } from "@/components/common/CopyButton"

describe("CopyButton reset timer", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
    })
  })

  afterEach(() => {
    cleanup()
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it("resets copied only 2s after the most recent click, not after an earlier one", async () => {
    const { container } = render(<CopyButton text="hello" />)
    const button = screen.getByRole("button")
    const isCopied = () => container.querySelector(".text-primary") !== null

    await act(async () => {
      fireEvent.click(button)
    })
    expect(isCopied()).toBe(true)

    // Second click happens before the first timer would fire.
    await act(async () => {
      vi.advanceTimersByTime(1500)
      fireEvent.click(button)
    })

    // At t=2000 the stale timer from the first click would reset `copied`
    // early in the buggy version; the reset must follow the latest click.
    await act(async () => {
      vi.advanceTimersByTime(500)
    })
    expect(isCopied()).toBe(true)

    // By t=3500 the timer belonging to the latest click has elapsed.
    await act(async () => {
      vi.advanceTimersByTime(1500)
    })
    expect(isCopied()).toBe(false)
  })

  it("clears the pending reset timer on unmount", async () => {
    const clearSpy = vi.spyOn(globalThis, "clearTimeout")
    const { unmount } = render(<CopyButton text="hello" />)

    await act(async () => {
      fireEvent.click(screen.getByRole("button"))
    })
    const before = clearSpy.mock.calls.length

    unmount()
    expect(clearSpy.mock.calls.length).toBeGreaterThan(before)
  })
})
