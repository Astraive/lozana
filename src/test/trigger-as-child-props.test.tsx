// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"

describe("asChild trigger props", () => {
  it("composes Sheet wrapper props, child props and handlers", () => {
    const wrapperClick = vi.fn()
    const childClick = vi.fn()
    render(
      <Sheet>
        <SheetTrigger asChild id="sheet-trigger" title="Open sheet" onClick={wrapperClick}>
          <button onClick={childClick}>Open sheet</button>
        </SheetTrigger>
        <SheetContent>Sheet content</SheetContent>
      </Sheet>,
    )
    const trigger = screen.getByRole("button", { name: "Open sheet" })
    expect(trigger.id).toBe("sheet-trigger")
    expect(trigger.getAttribute("title")).toBe("Open sheet")
    fireEvent.click(trigger)
    expect(childClick).toHaveBeenCalledOnce()
    expect(wrapperClick).toHaveBeenCalledOnce()
    expect(screen.getByText("Sheet content")).toBeTruthy()
  })

  it("composes Dropdown wrapper props, handlers and refs", () => {
    const wrapperClick = vi.fn()
    const childClick = vi.fn()
    const childRef = vi.fn()
    const wrapperRef = vi.fn()
    render(
      <DropdownMenu>
        <DropdownMenuTrigger asChild id="menu-trigger" title="Open menu" onClick={wrapperClick} ref={wrapperRef}>
          <button onClick={childClick} ref={childRef}>Open menu</button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>Menu content</DropdownMenuContent>
      </DropdownMenu>,
    )
    const trigger = screen.getByRole("button", { name: "Open menu" })
    expect(trigger.id).toBe("menu-trigger")
    expect(trigger.getAttribute("title")).toBe("Open menu")
    expect(wrapperRef).toHaveBeenCalledWith(trigger)
    expect(childRef).toHaveBeenCalledWith(trigger)
    fireEvent.click(trigger)
    expect(childClick).toHaveBeenCalledOnce()
    expect(wrapperClick).toHaveBeenCalledOnce()
    expect(screen.getByText("Menu content")).toBeTruthy()
  })
})
