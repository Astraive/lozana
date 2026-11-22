// @vitest-environment jsdom
import { createRef } from "react"
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { Button } from "@/components/ui/button"

describe("Button asChild", () => {
  it("renders its child as the styled interactive element and forwards props and refs", () => {
    const ref = createRef<HTMLButtonElement>()
    render(
      <Button asChild ref={ref} title="Explore queries" className="consumer-class">
        <a href="/queries">Saved queries</a>
      </Button>,
    )

    const link = screen.getByRole("link", { name: "Saved queries" })
    expect(link.tagName).toBe("A")
    expect(link.parentElement?.tagName).not.toBe("BUTTON")
    expect(link.getAttribute("title")).toBe("Explore queries")
    expect(link.className).toContain("consumer-class")
    expect(link.className).toContain("inline-flex")
    expect(ref.current).toBe(link)
  })
})
