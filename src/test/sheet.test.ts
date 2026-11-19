import { beforeEach, describe, expect, it, vi } from "vitest";

// The sheet components read `setOpen` from context. Mock just that hook so the
// components can be invoked directly in a node (non-DOM) test environment.
const { setOpen } = vi.hoisted(() => ({ setOpen: vi.fn() }));

vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return {
    ...actual,
    useContext: () => ({ open: true, setOpen }),
  };
});

import { SheetClose, SheetTrigger } from "@/components/ui/sheet";

type ClickableElement = { props: { onClick?: (event: unknown) => void } };

function clickHandler(element: unknown) {
  return (element as ClickableElement).props.onClick;
}

describe("SheetClose", () => {
  beforeEach(() => setOpen.mockClear());

  it("still closes when the consumer passes their own onClick", () => {
    const consumerOnClick = vi.fn();
    const element = SheetClose({ children: "Close", onClick: consumerOnClick });
    const event = { type: "click" };

    clickHandler(element)?.(event);

    // Regression: spreading props after the component's onClick used to drop
    // the close handler entirely when a consumer supplied onClick.
    expect(setOpen).toHaveBeenCalledWith(false);
    expect(consumerOnClick).toHaveBeenCalledWith(event);
  });

  it("closes when no consumer onClick is supplied", () => {
    const element = SheetClose({ children: "Close" });

    clickHandler(element)?.({ type: "click" });

    expect(setOpen).toHaveBeenCalledWith(false);
  });
});

describe("SheetTrigger", () => {
  beforeEach(() => setOpen.mockClear());

  it("still opens when the consumer passes their own onClick", () => {
    const consumerOnClick = vi.fn();
    const element = SheetTrigger({ children: "Open", onClick: consumerOnClick });
    const event = { type: "click" };

    clickHandler(element)?.(event);

    expect(setOpen).toHaveBeenCalledWith(true);
    expect(consumerOnClick).toHaveBeenCalledWith(event);
  });
});
