export type SortDirection = "asc" | "desc";

export interface SortConfig<T extends string = string> {
  field: T;
  direction: SortDirection;
}

export interface FilterConfig {
  field: string;
  operator: "eq" | "ne" | "gt" | "lt" | "gte" | "lte" | "contains" | "startswith" | "endswith";
  value: string | number | boolean;
}

export interface SelectOption {
  label: string;
  value: string;
  disabled?: boolean;
}
