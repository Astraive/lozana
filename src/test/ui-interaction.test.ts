import { describe, expect, it, vi } from "vitest";
import {
  chainEventHandlers,
  createScrollLock,
  getArrowKeyIndex,
  getPublicErrorMessage,
  isCommandPaletteShortcut,
  shouldResetErrorBoundary,
} from "@/lib/ui-utils";

describe("menu close on selection", () => {
  it("runs a consumer onClick and the internal close handler", () => {
    const consumer = vi.fn();
    const closeMenu = vi.fn();
    const event = { key: "Enter" };

    chainEventHandlers(consumer, closeMenu)(event as never);

    expect(consumer).toHaveBeenCalledWith(event);
    expect(closeMenu).toHaveBeenCalledWith(event);
  });

  it("still closes when no consumer handler is supplied", () => {
    const closeMenu = vi.fn();
    chainEventHandlers(undefined, closeMenu)({} as never);
    expect(closeMenu).toHaveBeenCalledOnce();
  });
});

describe("scroll-lock composition", () => {
  it("restores the previous overflow instead of clearing it", () => {
    const element = { style: { overflow: "scroll" } };
    const release = createScrollLock(element);

    expect(element.style.overflow).toBe("hidden");
    release();
    expect(element.style.overflow).toBe("scroll");
  });

  it("keeps an outer lock active when an inner sheet closes", () => {
    const element = { style: { overflow: "" } };
    const releaseOuter = createScrollLock(element);
    const releaseInner = createScrollLock(element);

    releaseInner();
    expect(element.style.overflow).toBe("hidden");
    releaseOuter();
    expect(element.style.overflow).toBe("");
  });

  it("ignores repeated releases", () => {
    const element = { style: { overflow: "auto" } };
    const release = createScrollLock(element);
    release();
    release();
    expect(element.style.overflow).toBe("auto");
  });
});

describe("arrow-key navigation", () => {
  it("moves and wraps through items", () => {
    expect(getArrowKeyIndex("ArrowDown", 0, 3)).toBe(1);
    expect(getArrowKeyIndex("ArrowDown", 2, 3)).toBe(0);
    expect(getArrowKeyIndex("ArrowUp", 0, 3)).toBe(2);
    expect(getArrowKeyIndex("ArrowRight", 1, 3)).toBe(2);
    expect(getArrowKeyIndex("ArrowLeft", 1, 3)).toBe(0);
  });

  it("starts at the first or last item when none is focused", () => {
    expect(getArrowKeyIndex("ArrowDown", -1, 3)).toBe(0);
    expect(getArrowKeyIndex("ArrowUp", -1, 3)).toBe(2);
  });

  it("ignores unrelated keys and empty lists", () => {
    expect(getArrowKeyIndex("Enter", 1, 3)).toBe(1);
    expect(getArrowKeyIndex("ArrowDown", 0, 0)).toBe(0);
  });
});

describe("Cmd+K shortcut", () => {
  it("matches Cmd+K and Ctrl+K", () => {
    expect(isCommandPaletteShortcut({ key: "k", metaKey: true, ctrlKey: false })).toBe(true);
    expect(isCommandPaletteShortcut({ key: "K", metaKey: false, ctrlKey: true })).toBe(true);
  });

  it("does not match a plain key press or a different key", () => {
    expect(isCommandPaletteShortcut({ key: "k", metaKey: false, ctrlKey: false })).toBe(false);
    expect(isCommandPaletteShortcut({ key: "a", metaKey: true, ctrlKey: false })).toBe(false);
  });
});

describe("error boundary", () => {
  it("never exposes the raw error message in user-facing text", () => {
    const message = getPublicErrorMessage(new Error("GET /internal?token=secret"));
    expect(message).not.toContain("secret");
    expect(message).not.toContain("/internal");
  });

  it("resets when children or the reset key change", () => {
    const child = { type: "div" };
    expect(shouldResetErrorBoundary(child, child, "a", "a")).toBe(false);
    expect(shouldResetErrorBoundary(child, { type: "span" }, "a", "a")).toBe(true);
    expect(shouldResetErrorBoundary(child, child, "a", "b")).toBe(true);
  });

  it("resets on route change even when children are referentially stable", () => {
    // App renders <Suspense><Routes/></Suspense> as a stable element reference;
    // only the router-derived resetKey changes on navigation.
    const stableChildren = { type: "Suspense" };
    expect(
      shouldResetErrorBoundary(stableChildren, stableChildren, "/overview", "/explore")
    ).toBe(true);
    expect(
      shouldResetErrorBoundary(stableChildren, stableChildren, "/explore", "/explore")
    ).toBe(false);
  });
});
