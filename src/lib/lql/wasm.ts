/** Optional editor bridge for the published LQL WASM package.
 *
 * The browser is intentionally limited to editor services. It never renders SQL
 * and never becomes an execution path for Collector queries.
 */

export interface LqlDiagnostic {
  code?: string;
  severity?: string;
  message: string;
  primary_span?: unknown;
  labels?: unknown[];
}

export interface LqlCompletion {
  label: string;
  kind?: string;
  detail?: string;
  insert_text?: string;
}

export interface LqlWasmAdapter {
  check(query: string): LqlDiagnostic[];
  complete(query: string, position: number): LqlCompletion[];
  format(query: string): string;
}

let adapter: LqlWasmAdapter | null = null;

/** Register the published WASM editor adapter when it is available. */
export function setLqlWasmAdapter(next: LqlWasmAdapter | null): void {
  adapter = next;
}

/** Check LQL locally for editor feedback; execution remains server-side. */
export function checkLql(query: string): LqlDiagnostic[] {
  return adapter?.check(query) ?? [];
}

/** Request completions from the published LQL WASM editor API. */
export function completeLql(query: string, position = query.length): LqlCompletion[] {
  return adapter?.complete(query, position) ?? [];
}

/** Format LQL through the published WASM formatter when loaded. */
export function formatLql(query: string): string {
  return adapter?.format(query) ?? query;
}

export function hasLqlWasmAdapter(): boolean {
  return adapter !== null;
}
