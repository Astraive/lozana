import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { DropdownMenu, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

function clonedRef(
  triggerRef: React.Ref<HTMLButtonElement>,
  childRef: React.Ref<HTMLButtonElement>,
): (node: HTMLButtonElement | null) => void {
  let receivedRef: React.Ref<HTMLButtonElement> | undefined;

  function Probe(props: { ref?: React.Ref<HTMLButtonElement> }) {
    // React 19 passes `ref` through as a normal prop, so SSR lets us observe
    // the ref the trigger clones onto its child without needing a DOM.
    receivedRef = props.ref;
    return null;
  }

  renderToStaticMarkup(
    <DropdownMenu>
      <DropdownMenuTrigger asChild ref={triggerRef}>
        <Probe ref={childRef} />
      </DropdownMenuTrigger>
    </DropdownMenu>,
  );

  expect(typeof receivedRef, "trigger must clone a ref onto its child").toBe("function");
  return receivedRef as (node: HTMLButtonElement | null) => void;
}

describe("DropdownMenuTrigger asChild ref forwarding", () => {
  it("preserves the child's own ref and the forwarded trigger ref", () => {
    const childRef = vi.fn();
    const triggerRef = vi.fn();
    const ref = clonedRef(triggerRef, childRef);
    const node = { tagName: "BUTTON" } as HTMLButtonElement;

    ref(node);

    expect(childRef).toHaveBeenCalledTimes(1);
    expect(childRef).toHaveBeenCalledWith(node);
    expect(triggerRef).toHaveBeenCalledTimes(1);
    expect(triggerRef).toHaveBeenCalledWith(node);
  });

  it("updates object refs on the child and the trigger, and clears them on detach", () => {
    const childRefObject: React.RefObject<HTMLButtonElement | null> = { current: null };
    const triggerRefObject: React.RefObject<HTMLButtonElement | null> = { current: null };
    const ref = clonedRef(triggerRefObject, childRefObject);
    const node = { tagName: "BUTTON" } as HTMLButtonElement;

    ref(node);
    expect(childRefObject.current).toBe(node);
    expect(triggerRefObject.current).toBe(node);

    ref(null);
    expect(childRefObject.current).toBeNull();
    expect(triggerRefObject.current).toBeNull();
  });
});
