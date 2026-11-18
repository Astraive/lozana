import type * as React from "react";
import { describe, it, expect, vi } from "vitest";
import { composeTriggerClick } from "@/components/ui/dropdown-menu";

type TriggerMouseEvent = React.MouseEvent<HTMLButtonElement>;

function makeEvent(defaultPrevented = false): TriggerMouseEvent {
  const event = {
    defaultPrevented,
    preventDefault() {
      event.defaultPrevented = true;
    },
  };
  return event as unknown as TriggerMouseEvent;
}

describe("DropdownMenuTrigger click composition", () => {
  it("runs the consumer onClick and still toggles open state", () => {
    // Regression for #70: a caller-supplied onClick used to override the
    // internal toggle through {...props}, so the menu never opened.
    const onClick = vi.fn();
    const toggle = vi.fn();

    composeTriggerClick(onClick, toggle)(makeEvent());

    expect(onClick).toHaveBeenCalledOnce();
    expect(toggle).toHaveBeenCalledOnce();
  });

  it("lets the consumer opt out of toggling with preventDefault", () => {
    const onClick = vi.fn((event: TriggerMouseEvent) => event.preventDefault());
    const toggle = vi.fn();

    composeTriggerClick(onClick, toggle)(makeEvent());

    expect(onClick).toHaveBeenCalledOnce();
    expect(toggle).not.toHaveBeenCalled();
  });

  it("toggles normally when no consumer onClick is provided", () => {
    const toggle = vi.fn();

    composeTriggerClick(undefined, toggle)(makeEvent());

    expect(toggle).toHaveBeenCalledOnce();
  });

  it("calls the consumer handler before the toggle", () => {
    const order: string[] = [];
    const onClick = vi.fn(() => order.push("consumer"));
    const toggle = vi.fn(() => order.push("toggle"));

    composeTriggerClick(onClick, toggle)(makeEvent());

    expect(order).toEqual(["consumer", "toggle"]);
  });
});
