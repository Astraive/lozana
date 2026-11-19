// @vitest-environment jsdom
import * as React from "react"
import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { JsonViewer } from "@/components/common/JsonViewer"

const data = { nested: { value: 1 } }
const globals = globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }

describe("JsonViewer reactive expanded prop", () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    globals.IS_REACT_ACT_ENVIRONMENT = true
    container = document.createElement("div")
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
    globals.IS_REACT_ACT_ENVIRONMENT = false
  })

  function render(expanded: boolean) {
    act(() => {
      root.render(<JsonViewer data={data} expanded={expanded} />)
    })
  }

  it("collapses an already-mounted tree when expanded changes to false", () => {
    render(true)
    expect(container.textContent).toContain("nested")
    expect(container.textContent).toContain("value")
    expect(container.textContent).not.toContain("1 keys")

    render(false)

    expect(container.textContent).toContain("1 keys")
    expect(container.textContent).not.toContain("value")
  })

  it("expands an already-mounted tree when expanded changes to true", () => {
    render(false)
    expect(container.textContent).toContain("1 keys")

    render(true)

    expect(container.textContent).not.toContain("1 keys")
    expect(container.textContent).toContain("value")
  })
})
