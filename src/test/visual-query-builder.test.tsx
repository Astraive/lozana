import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { VisualQueryBuilder } from "@/components/lql/VisualQueryBuilder";

describe("VisualQueryBuilder initialQuery", () => {
  it("opens with the active query instead of discarding it for hardcoded defaults", () => {
    const html = renderToStaticMarkup(
      <VisualQueryBuilder
        initialQuery={'from events | where timestamp >= ago(24h) | where service = "api" | where level = "error" | sort service asc | take 50'}
        onApply={() => {}}
      />,
    );

    // The live generated-LQL preview is rendered from the hydrated state.
    expect(html).toContain("ago(24h)");
    expect(html).toContain("where service =");
    expect(html).toContain("where level =");
    expect(html).toContain("sort service asc");
    expect(html).toContain("take 50");
    expect(html).not.toContain("ago(1h)");
    expect(html).not.toContain("take 100");
  });

  it("keeps the previous defaults when no initial query is provided", () => {
    const html = renderToStaticMarkup(<VisualQueryBuilder onApply={() => {}} />);

    expect(html).toContain("ago(1h)");
    expect(html).toContain("sort timestamp desc");
    expect(html).toContain("take 100");
  });
});
