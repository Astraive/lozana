import { describe, expect, it } from "vitest"
import { renderToString } from "react-dom/server"
import { useTable, type SortingState } from "@tanstack/react-table"
import { DataTable } from "@/components/data/DataTable"

/** React SSR injects `<!-- -->` separators between adjacent text nodes. */
const renderedText = (html: string) => html.replace(/<!--\s*-->/g, "")

const rows = [
  { name: "item10", value: 10 },
  { name: "item2", value: 2 },
  { name: "item1", value: 1 },
]
const columns = [{ id: "name", accessorKey: "name", header: "Name" }]

describe("DataTable v9 table setup (MASS-0893)", () => {
  it("no longer imports or calls the deprecated v8 compatibility API", () => {
    const sources = import.meta.glob("../components/data/DataTable.tsx", {
      query: "?raw",
      import: "default",
      eager: true,
    })
    const source = sources["../components/data/DataTable.tsx"] as string

    expect(source).not.toContain("@tanstack/react-table/legacy")
    expect(source).not.toMatch(/\buseLegacyTable\b/)
    expect(source).not.toMatch(/\bget(Core|Sorted|Pagination)RowModel\b/)
    expect(source).toContain("useTable")
  })

  it("registers sorting, pagination and visibility as explicit v9 feature slots", async () => {
    const { dataTableFeatures } = await import("@/components/data/data-table-features")

    expect(dataTableFeatures.rowSortingFeature).toBeDefined()
    expect(dataTableFeatures.rowPaginationFeature).toBeDefined()
    expect(dataTableFeatures.columnVisibilityFeature).toBeDefined()
    expect(dataTableFeatures.sortedRowModel).toBeTypeOf("function")
    expect(dataTableFeatures.paginatedRowModel).toBeTypeOf("function")
    expect(dataTableFeatures.sortFns).toHaveProperty("alphanumeric")
  })

  it("renders only the current page and reports the correct page count", () => {
    const html = renderedText(
      renderToString(<DataTable data={rows} columns={columns} pageSize={2} />),
    )

    expect(html).toContain("Page 1 of 2")
    expect(html).toContain("3 rows")
    expect(html.match(/<td/g)).toHaveLength(2)
    expect(html).toContain(">item10</td>")
    expect(html).toContain(">item2</td>")
    expect(html).not.toContain(">item1</td>")
  })

  it("sorts rows through the registered sortedRowModel slot", async () => {
    const { dataTableFeatures } = await import("@/components/data/data-table-features")

    function SortedNames({ sorting }: { sorting: SortingState }) {
      const table = useTable({
        features: dataTableFeatures,
        data: rows,
        columns,
        state: { sorting },
        initialState: { pagination: { pageIndex: 0, pageSize: 100 } },
      })
      return (
        <>
          {table.getRowModel().rows.map((row) => (
            <span key={row.id}>{String(row.getValue("name"))}</span>
          ))}
        </>
      )
    }

    const html = renderedText(
      renderToString(<SortedNames sorting={[{ id: "name", desc: false }]} />),
    )

    expect(html).toBe(
      "<span>item1</span><span>item2</span><span>item10</span>",
    )
  })
})
