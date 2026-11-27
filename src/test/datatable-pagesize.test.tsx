// @vitest-environment jsdom
import * as React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DataTable } from "@/components/data/DataTable";
import type { DataTableColumnDef } from "@/components/data/DataTable";

type Row = { id: number };

const data: Row[] = Array.from({ length: 6 }, (_, i) => ({ id: i + 1 }));
const columns: DataTableColumnDef<Row>[] = [
  {
    accessorKey: "id",
    header: "ID",
    cell: (info) => String(info.getValue()),
  },
];

let container: HTMLDivElement;
let root: Root;

function renderPageSize(pageSize: number, rows = data) {
  act(() => {
    root.render(<DataTable data={rows} columns={columns} pageSize={pageSize} />);
  });
}

function bodyRowCount() {
  return container.querySelectorAll("tbody tr").length;
}

function clickNext() {
  const next = Array.from(container.querySelectorAll("button")).find(
    (button) => button.textContent === "Next"
  );
  if (!next) throw new Error("Next page button is missing");
  act(() => next.dispatchEvent(new MouseEvent("click", { bubbles: true })));
}

beforeEach(() => {
  (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe("DataTable pageSize", () => {
  it("applies the initial pageSize on mount", () => {
    renderPageSize(2);
    expect(bodyRowCount()).toBe(2);
  });

  it("re-applies pageSize when the prop changes after mount", () => {
    renderPageSize(2);
    expect(bodyRowCount()).toBe(2);

    // Same mounted table instance, only the prop changes.
    renderPageSize(4);
    expect(bodyRowCount()).toBe(4);
  });

  it("keeps page navigation working with the controlled pageSize", () => {
    renderPageSize(2);
    expect(bodyRowCount()).toBe(2);

    clickNext();

    expect(bodyRowCount()).toBe(2);
    expect(container.textContent).toContain("Page 2 of 3");
  });

  it("resets to the first page when a page-size change makes the current page out of range", () => {
    renderPageSize(2);
    clickNext();
    clickNext();
    expect(bodyRowCount()).toBe(2);
    expect(container.textContent).toContain("Page 3 of 3");

    renderPageSize(4);
    expect(bodyRowCount()).toBe(4);
    expect(container.textContent).toContain("Page 1 of 2");
  });

  it("resets to the first page when data shrinks and the current page is out of range", () => {
    renderPageSize(2);
    clickNext();
    clickNext();
    expect(container.textContent).toContain("Page 3 of 3");

    renderPageSize(2, data.slice(0, 4));
    expect(bodyRowCount()).toBe(2);
    expect(container.textContent).toContain("Page 1 of 2");
  });
});
