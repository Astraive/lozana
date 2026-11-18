import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type React from "react";
import { describe, expect, it, vi } from "vitest";
import { composeSheetClickHandler } from "@/components/ui/sheet";

const mouseEvent = (detail: number) => ({ detail }) as React.MouseEvent<HTMLButtonElement>;

describe("SheetTrigger consumer onClick", () => {
  it("opens the sheet and still calls a consumer-supplied onClick", () => {
    // Regression for the bug where `{...props}` was spread *after* onClick,
    // so a caller's onClick replaced the open handler and the sheet never opened.
    const onOpen = vi.fn();
    const consumerOnClick = vi.fn();
    const event = mouseEvent(1);

    const handler = composeSheetClickHandler(onOpen, consumerOnClick);
    handler(event);

    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(consumerOnClick).toHaveBeenCalledTimes(1);
    expect(consumerOnClick).toHaveBeenCalledWith(event);
  });

  it("opens the sheet when no consumer onClick is supplied", () => {
    const onOpen = vi.fn();

    composeSheetClickHandler(onOpen)(mouseEvent(2));

    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it("opens the sheet before forwarding to the consumer handler", () => {
    const calls: string[] = [];
    const handler = composeSheetClickHandler(
      () => calls.push("open"),
      () => calls.push("consumer"),
    );

    handler(mouseEvent(3));

    expect(calls).toEqual(["open", "consumer"]);
  });
});

describe("sheet button prop spread order", () => {
  it("applies consumer props before the composed onClick on SheetTrigger and SheetClose", () => {
    // Behavioral tests above cover the composed handler. This structural guard
    // covers the root cause: onClick must come after `{...props}` so a consumer
    // onClick cannot override it (the original defect at sheet.tsx:60).
    const source = readFileSync(
      fileURLToPath(new URL("../components/ui/sheet.tsx", import.meta.url)),
      "utf8",
    );

    for (const marker of ["SheetTrigger", "SheetClose"]) {
      const start = source.indexOf(`function ${marker}(`);
      expect(start, `${marker} not found`).toBeGreaterThanOrEqual(0);
      const button = source.slice(start, source.indexOf("</button>", start));
      const spreadAt = button.indexOf("{...props}");
      const onClickAt = button.indexOf("onClick=");
      expect(spreadAt, `${marker}: props spread not found`).toBeGreaterThanOrEqual(0);
      expect(onClickAt, `${marker}: onClick not found`).toBeGreaterThanOrEqual(0);
      expect(onClickAt, `${marker}: onClick must be applied after {...props}`).toBeGreaterThan(spreadAt);
    }
  });
});
