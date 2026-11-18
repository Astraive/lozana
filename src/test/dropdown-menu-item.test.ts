import { beforeEach, describe, expect, it, vi } from "vitest";
import type { KeyboardEvent, MouseEvent } from "react";

const { setOpen } = vi.hoisted(() => ({ setOpen: vi.fn() }));

// The item reads `setOpen` from the menu context. Stub `useContext` so the
// component can be invoked directly and its rendered handlers exercised
// without a DOM renderer (none is installed in this project).
vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return {
    ...actual,
    useContext: () => ({ open: true, setOpen, triggerRef: { current: null } }),
  };
});

import { DropdownMenuItem } from "@/components/ui/dropdown-menu";

type ItemHandlers = {
  onClick: (e: MouseEvent<HTMLDivElement>) => void;
  onKeyDown: (e: KeyboardEvent<HTMLDivElement>) => void;
};

function getItemHandlers(props: Record<string, unknown> = {}): ItemHandlers {
  const element = (
    DropdownMenuItem as unknown as (p: Record<string, unknown>) => { props: ItemHandlers }
  )({ children: "Item", ...props });
  return element.props;
}

function mouseEvent() {
  return {
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
  } as unknown as MouseEvent<HTMLDivElement>;
}

function keyEvent(key: string) {
  return {
    key,
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
  } as unknown as KeyboardEvent<HTMLDivElement>;
}

describe("DropdownMenuItem auto-close with consumer handlers", () => {
  beforeEach(() => {
    setOpen.mockClear();
  });

  it("closes the menu and still calls a consumer onClick", () => {
    const onClick = vi.fn();
    const handlers = getItemHandlers({ onClick });
    const event = mouseEvent();

    handlers.onClick(event);

    expect(onClick).toHaveBeenCalledWith(event);
    expect(setOpen).toHaveBeenCalledWith(false);
  });

  it("closes the menu on Enter and still calls a consumer onKeyDown", () => {
    const onKeyDown = vi.fn();
    const handlers = getItemHandlers({ onKeyDown });
    const event = keyEvent("Enter");

    handlers.onKeyDown(event);

    expect(onKeyDown).toHaveBeenCalledWith(event);
    expect(event.preventDefault).toHaveBeenCalledTimes(1);
    expect(setOpen).toHaveBeenCalledWith(false);
  });

  it("closes the menu on Space and still calls a consumer onKeyDown", () => {
    const onKeyDown = vi.fn();
    const handlers = getItemHandlers({ onKeyDown });
    const event = keyEvent(" ");

    handlers.onKeyDown(event);

    expect(onKeyDown).toHaveBeenCalledWith(event);
    expect(event.preventDefault).toHaveBeenCalledTimes(1);
    expect(setOpen).toHaveBeenCalledWith(false);
  });

  it("forwards non-activation keys to the consumer without closing the menu", () => {
    const onKeyDown = vi.fn();
    const handlers = getItemHandlers({ onKeyDown });
    const event = keyEvent("a");

    handlers.onKeyDown(event);

    expect(onKeyDown).toHaveBeenCalledWith(event);
    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(setOpen).not.toHaveBeenCalled();
  });

  it("still closes the menu when no consumer handlers are supplied", () => {
    const handlers = getItemHandlers();

    handlers.onClick(mouseEvent());
    expect(setOpen).toHaveBeenCalledWith(false);

    setOpen.mockClear();
    handlers.onKeyDown(keyEvent("Enter"));
    expect(setOpen).toHaveBeenCalledWith(false);
  });
});
