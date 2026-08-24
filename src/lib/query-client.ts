import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

export function removeScopeQueries(): void {
  queryClient.removeQueries({ queryKey: ["scope"] });
}

export function scopedQueryKey(scopeRevision: number, ...parts: readonly unknown[]): readonly unknown[] {
  return ["scope", scopeRevision, ...parts];
}
