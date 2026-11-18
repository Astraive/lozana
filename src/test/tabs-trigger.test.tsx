import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { Tabs, TabsTrigger } from "@/components/ui/tabs";

describe("TabsTrigger prop handling", () => {
  it("does not let consumer props override internal type/role/aria-selected", () => {
    const html = renderToStaticMarkup(
      <Tabs defaultValue="a">
        <TabsTrigger
          value="a"
          type="submit"
          role="button"
          aria-selected={false}
          data-testid="tab-a"
        >
          A
        </TabsTrigger>
      </Tabs>,
    );

    // Internal accessibility/structural attributes must win over spread props.
    expect(html).toContain('type="button"');
    expect(html).toContain('role="tab"');
    expect(html).toContain('aria-selected="true"');
    expect(html).not.toContain('type="submit"');
    expect(html).not.toContain('role="button"');
    expect(html).not.toContain('aria-selected="false"');
    // Unrelated consumer props are still forwarded.
    expect(html).toContain('data-testid="tab-a"');
  });

  it("runs both the consumer onClick and the internal tab-switch handler", () => {
    const onValueChange = vi.fn();
    const consumerOnClick = vi.fn();
    let triggerProps: React.ComponentProps<"button"> | undefined;

    // Render inside a real Tabs provider so useContext resolves, and capture the
    // actual element props produced by TabsTrigger to exercise its onClick.
    function CaptureProps() {
      const element = TabsTrigger({ value: "b", onClick: consumerOnClick });
      triggerProps = element.props as React.ComponentProps<"button">;
      return null;
    }

    renderToStaticMarkup(
      <Tabs defaultValue="a" onValueChange={onValueChange}>
        <CaptureProps />
      </Tabs>,
    );

    expect(triggerProps?.onClick).toBeTypeOf("function");
    const event = {} as React.MouseEvent<HTMLButtonElement>;
    triggerProps!.onClick!(event);

    expect(consumerOnClick).toHaveBeenCalledTimes(1);
    expect(consumerOnClick).toHaveBeenCalledWith(event);
    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange).toHaveBeenCalledWith("b");
  });
});
