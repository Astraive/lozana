import { describe, expect, it } from "vitest"
import { createScrollLock } from "./ui-utils"

describe("createScrollLock", () => {
  it("preserves the first overflow until the final overlapping lock releases", () => {
    const element = { style: { overflow: "scroll" } }
    const releaseA = createScrollLock(element)
    const releaseB = createScrollLock(element)
    releaseA()
    expect(element.style.overflow).toBe("hidden")
    releaseB()
    expect(element.style.overflow).toBe("scroll")
  })

  it("supports reverse release order and idempotent cleanup", () => {
    const element = { style: { overflow: "auto" } }
    const releaseA = createScrollLock(element)
    const releaseB = createScrollLock(element)
    releaseB()
    expect(element.style.overflow).toBe("hidden")
    releaseB()
    expect(element.style.overflow).toBe("hidden")
    releaseA()
    expect(element.style.overflow).toBe("auto")
    releaseA()
    expect(element.style.overflow).toBe("auto")
  })

  it("keeps locks on different elements independent and allows reacquisition", () => {
    const first = { style: { overflow: "scroll" } }
    const second = { style: { overflow: "auto" } }
    const releaseFirst = createScrollLock(first)
    const releaseSecond = createScrollLock(second)
    releaseFirst()
    expect(first.style.overflow).toBe("scroll")
    expect(second.style.overflow).toBe("hidden")
    releaseSecond()
    expect(second.style.overflow).toBe("auto")
    const releaseAgain = createScrollLock(first)
    expect(first.style.overflow).toBe("hidden")
    releaseAgain()
    expect(first.style.overflow).toBe("scroll")
  })
})
