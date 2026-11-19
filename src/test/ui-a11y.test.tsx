import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TimeRangePicker } from "@/components/common/TimeRangePicker";
import { JsonViewer } from "@/components/common/JsonViewer";

describe("tabs accessibility", () => {
  it("exposes tablist/tab/tabpanel roles with wired ids and roving tabindex", () => {
    const html = renderToStaticMarkup(
      <Tabs defaultValue="a">
        <TabsList>
          <TabsTrigger value="a">A</TabsTrigger>
          <TabsTrigger value="b">B</TabsTrigger>
        </TabsList>
        <TabsContent value="a">Panel A</TabsContent>
        <TabsContent value="b">Panel B</TabsContent>
      </Tabs>
    );

    expect(html).toContain('role="tablist"');
    expect(html.match(/role="tab"/g)).toHaveLength(2);
    expect(html).toContain('role="tabpanel"');
    expect(html).toContain('aria-selected="true"');
    expect(html).toContain('aria-selected="false"');

    const ids = new Set(Array.from(html.matchAll(/ id="([^"]+)"/g), (m) => m[1]));
    expect(ids.size).toBeGreaterThan(0);
    for (const match of html.matchAll(/aria-controls="([^"]+)"/g)) {
      expect(ids.has(match[1])).toBe(true);
    }
    for (const match of html.matchAll(/aria-labelledby="([^"]+)"/g)) {
      expect(ids.has(match[1])).toBe(true);
    }

    // Roving tabindex: only the selected tab is in the tab sequence;
    // the active tabpanel is also focusable.
    expect(html.match(/tabindex="0"/g)).toHaveLength(2);
    expect(html.match(/tabindex="-1"/g)).toHaveLength(1);
  });
});

describe("time range picker accessibility", () => {
  it("exposes a combobox linked to a listbox", () => {
    const html = renderToStaticMarkup(
      <TimeRangePicker value="1h" onChange={() => {}} />
    );

    expect(html).toContain('role="combobox"');
    expect(html).toContain('aria-haspopup="listbox"');
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain("aria-controls=");
    expect(html).toContain("Last 1h");
  });
});

describe("json viewer accessibility", () => {
  it("uses real buttons for expanders with aria-expanded", () => {
    const html = renderToStaticMarkup(
      <JsonViewer data={{ items: [1, 2], nested: { a: 1 } }} />
    );

    expect(html).toContain('aria-expanded="true"');
    expect(html).toContain('aria-label="Toggle items"');
    expect(html).toContain('aria-label="Toggle nested"');
    expect((html.match(/<button/g) ?? []).length).toBeGreaterThanOrEqual(2);
  });

  it("reports collapsed state when expanded is false", () => {
    const html = renderToStaticMarkup(
      <JsonViewer data={{ nested: { a: 1 } }} expanded={false} />
    );
    expect(html).toContain('aria-expanded="false"');
  });
});
