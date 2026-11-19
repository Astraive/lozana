import {
  columnVisibilityFeature,
  createPaginatedRowModel,
  createSortedRowModel,
  rowPaginationFeature,
  rowSortingFeature,
  sortFns,
  tableFeatures,
} from "@tanstack/react-table"

/**
 * Feature slots used by `DataTable`.
 *
 * Defined once at module scope (not per render) and kept separate from the
 * React component so the configuration can be exercised in tests without
 * mounting a DOM tree. Row models are registered as feature slots, replacing
 * the deprecated `getSortedRowModel()` / `getPaginationRowModel()` stubs from
 * `@tanstack/react-table/legacy`.
 */
export const dataTableFeatures = tableFeatures({
  // `row.getVisibleCells()` in DataTable is provided by the visibility feature.
  columnVisibilityFeature,
  rowSortingFeature,
  rowPaginationFeature,
  sortedRowModel: createSortedRowModel(),
  paginatedRowModel: createPaginatedRowModel(),
  // The legacy bridge registered the whole built-in registry. Keep it here so
  // named sort functions (and `sortFn: "auto"`) resolve identically.
  sortFns,
})
