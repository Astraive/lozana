import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { renderMarkdownContent } from "@/components/panels/markdown-content";

// Static rendering of the same element tree the panel mounts. react-markdown's
// default export is synchronous, so this needs no DOM or browser environment.
function renderMarkdown(source: string): string {
  return renderToStaticMarkup(renderMarkdownContent(source));
}

describe("markdown panel content", () => {
  it("parses markdown syntax into elements instead of rendering it literally", () => {
    const html = renderMarkdown("### Dashboard Notes\n\nBody **text** here.");

    expect(html).toContain("<h3>Dashboard Notes</h3>");
    expect(html).toContain("<strong>text</strong>");
    expect(html).toContain("<p>Body ");
    // The bug being fixed: '###' was previously emitted as literal text.
    expect(html).not.toContain("###");
  });

  it("renders the panel's default content as a real heading", () => {
    const html = renderMarkdown(
      "### Dashboard Notes\n\nAdd documentation, runbook links, or triage instructions here.",
    );

    expect(html).toContain("<h3>Dashboard Notes</h3>");
    expect(html).toContain(
      "<p>Add documentation, runbook links, or triage instructions here.</p>",
    );
  });

  it("sanitizes raw HTML and unsafe URLs so untrusted content cannot inject scripts", () => {
    const html = renderMarkdown(
      "<script>alert(1)</script>\n\n<img src=x onerror=alert(1)>\n\n[click](javascript:alert(1))",
    );

    expect(html).not.toContain("<script");
    expect(html).not.toContain("alert(1)");
    expect(html).not.toContain("onerror");
    expect(html).not.toContain("javascript:");
  });

  it("renders GFM tables and task lists", () => {
    const html = renderMarkdown(
      "| Service | Status |\n| --- | --- |\n| api | ok |\n\n- [x] done",
    );

    expect(html).toContain("<table>");
    expect(html).toContain("<td>api</td>");
    expect(html).toContain('type="checkbox"');
  });
});
