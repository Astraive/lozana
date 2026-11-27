import * as React from "react"
import {
  flexRender,
  useTable,
  type ColumnDef,
  type RowData,
  type SortingState,
} from "@tanstack/react-table"
import { dataTableFeatures } from "@/components/data/data-table-features"
import { cn } from "@/lib/cn"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"

/** Column definition type bound to the features `DataTable` registers. */
export type DataTableColumnDef<TData extends RowData> = ColumnDef<
  typeof dataTableFeatures,
  TData,
  unknown
>

interface DataTableProps<TData extends RowData> {
  data: TData[]
  columns: DataTableColumnDef<TData>[]
  className?: string
  pageSize?: number
}

export function DataTable<TData extends RowData>({
  data,
  columns,
  className,
  pageSize = 20,
}: DataTableProps<TData>) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize,
    dataLength: data.length,
  })
  if (pagination.pageSize !== pageSize || pagination.dataLength !== data.length) {
    setPagination({ pageIndex: 0, pageSize, dataLength: data.length })
  }
  const tablePagination = { pageIndex: pagination.pageIndex, pageSize: pagination.pageSize }
  const table = useTable({
    features: dataTableFeatures,
    data,
    columns,
    state: { sorting, pagination: tablePagination },
    onSortingChange: setSorting,
    onPaginationChange: (updater) => {
      setPagination((previous) => {
        const current = { pageIndex: previous.pageIndex, pageSize: previous.pageSize }
        const next = typeof updater === "function" ? updater(current) : updater
        return { ...next, dataLength: data.length }
      })
    },
  })

  return (
    <div className={cn("space-y-4", className)}>
      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent">
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className={cn(
                      "h-11",
                      header.column.getCanSort() && "cursor-pointer select-none hover:text-primary transition-colors"
                    )}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <div className="flex items-center gap-2">
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                      {header.column.getIsSorted() && (
                        <span className="text-xs text-primary">
                          {header.column.getIsSorted() === "asc" ? "\u2191" : "\u2193"}
                        </span>
                      )}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-muted-foreground font-mono"
                >
                  No results found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between px-2">
        <div className="text-sm text-muted-foreground font-mono">
          {table.getFilteredRowModel().rows.length} rows
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground font-mono">
            Page {table.state.pagination.pageIndex + 1} of{" "}
            {table.getPageCount()}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  )
}
