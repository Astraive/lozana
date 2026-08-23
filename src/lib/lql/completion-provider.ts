import type * as MonacoType from "monaco-editor";
import {
  LQL_LANGUAGE_ID,
  LQL_KEYWORDS,
  LQL_AGGREGATES,
  LQL_FUNCTIONS,
  LQL_OPERATORS,
  LQL_CANONICAL_FIELDS,
} from "./monaco-lql";

let isProviderRegistered = false;

const FUNCTION_DOCS: Record<string, { desc: string; syntax: string; example: string }> = {
  bin: {
    desc: "Rounds values down to an integer multiple of the given bin size. Commonly used for time-series aggregation.",
    syntax: "bin(timestamp, duration)",
    example: "summarize count() by bin(timestamp, 5m)",
  },
  ago: {
    desc: "Subtracts the given duration from the current time.",
    syntax: "ago(duration)",
    example: "where timestamp >= ago(1h)",
  },
  now: {
    desc: "Returns the current UTC timestamp.",
    syntax: "now()",
    example: "where timestamp >= ago(24h)",
  },
  count: {
    desc: "Returns the count of events in each group.",
    syntax: "count()",
    example: "summarize count() by service",
  },
  p95: {
    desc: "Calculates the 95th percentile of a numeric expression across events.",
    syntax: "p95(numeric_field)",
    example: "summarize p95(duration_ms) by service",
  },
  p99: {
    desc: "Calculates the 99th percentile of a numeric expression across events.",
    syntax: "p99(numeric_field)",
    example: "summarize p99(duration_ms) by route",
  },
  avg: {
    desc: "Calculates the arithmetic average of numeric values.",
    syntax: "avg(numeric_field)",
    example: "summarize avg(duration_ms) by service",
  },
  dcount: {
    desc: "Calculates the approximate distinct count of unique values.",
    syntax: "dcount(field)",
    example: "summarize dcount(user.id) by service",
  },
  coalesce: {
    desc: "Returns the first non-null argument.",
    syntax: "coalesce(expr1, expr2, ...)",
    example: "extend user_id = coalesce(user.id, tenant.id, 'anonymous')",
  },
};

const KEYWORD_DOCS: Record<string, string> = {
  from: "Specifies the data source table (e.g. `from events`).",
  where: "Filters rows based on a boolean condition (e.g. `where level = 'error'`).",
  summarize: "Aggregates data by group keys (e.g. `summarize count() by service`).",
  by: "Specifies the grouping columns in a summarize clause.",
  sort: "Orders output rows (e.g. `sort timestamp desc`).",
  take: "Limits output to the top N rows (alias: `limit`).",
  limit: "Limits output to the top N rows.",
  distinct: "Deduplicates output rows by specified columns.",
  project: "Selects and renames columns to include in the output.",
  extend: "Computes and adds new derived columns to output rows.",
};

const SNIPPETS = [
  {
    label: "summarize count by bin",
    insertText: "summarize event_count = count() by bin(timestamp, ${1:5m})",
    detail: "LQL Aggregate Snippet",
    documentation: "Group events into time buckets and count totals",
  },
  {
    label: "summarize latency percentiles",
    insertText: "summarize p50_duration_ms = p50(${1:duration_ms}), p95_duration_ms = p95(${1:duration_ms}), p99_duration_ms = p99(${1:duration_ms}) by ${2:service}",
    detail: "LQL Latency Percentiles",
    documentation: "Compute P50, P95, and P99 latency percentiles by service",
  },
  {
    label: "filter errors and sort",
    insertText: 'where level = "error" or level = "fatal"\n| sort timestamp desc\n| take ${1:100}',
    detail: "LQL Filter Snippet",
    documentation: "Filter for critical errors and sort by latest",
  },
  {
    label: "top routes by latency",
    insertText: "where route != \"\"\n| summarize event_count = count(), avg_duration_ms = avg(duration_ms), p95_duration_ms = p95(duration_ms) by route\n| sort p95_duration_ms desc\n| take 20",
    detail: "LQL Slow Endpoints Snippet",
    documentation: "Find the slowest API endpoints by P95 duration",
  },
];

export function registerLqlCompletionProvider(
  monaco: typeof MonacoType,
  getCustomAttributes?: () => string[]
): void {
  if (isProviderRegistered) return;
  isProviderRegistered = true;

  monaco.languages.registerCompletionItemProvider(LQL_LANGUAGE_ID, {
    provideCompletionItems: (model, position) => {
      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };

      const suggestions: MonacoType.languages.CompletionItem[] = [];

      // 1. Snippets
      for (const snippet of SNIPPETS) {
        suggestions.push({
          label: snippet.label,
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: snippet.insertText,
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          detail: snippet.detail,
          documentation: snippet.documentation,
          range,
        });
      }

      // 2. Keywords
      for (const kw of LQL_KEYWORDS) {
        suggestions.push({
          label: kw,
          kind: monaco.languages.CompletionItemKind.Keyword,
          insertText: kw,
          range,
        });
      }

      for (const operator of LQL_OPERATORS) {
        suggestions.push({
          label: operator,
          kind: monaco.languages.CompletionItemKind.Operator,
          insertText: operator,
          detail: `LQL infix operator: field ${operator} value`,
          range,
        });
      }

      // 3. Aggregates
      for (const agg of LQL_AGGREGATES) {
        suggestions.push({
          label: agg,
          kind: monaco.languages.CompletionItemKind.Function,
          insertText: agg === "count"
            ? "count()"
            : agg === "percentile"
            ? "percentile(${1:field}, ${2:95})"
            : `${agg}(\${1:field})`,
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          detail: `Aggregate function: ${agg}()`,
          range,
        });
      }

      // 4. Built-in functions
      for (const fn of LQL_FUNCTIONS) {
        const doc = FUNCTION_DOCS[fn];
        suggestions.push({
          label: fn,
          kind: monaco.languages.CompletionItemKind.Function,
          insertText: fn === "now" ? "now()" : `${fn}(\${1:arg})`,
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          detail: doc?.syntax || `Function: ${fn}()`,
          documentation: doc ? `${doc.desc}\n\nExample: \`${doc.example}\`` : undefined,
          range,
        });
      }

      // 5. Canonical Fields
      for (const field of LQL_CANONICAL_FIELDS) {
        suggestions.push({
          label: field,
          kind: monaco.languages.CompletionItemKind.Field,
          insertText: field,
          detail: "Loza Canonical Field",
          range,
        });
      }

      // 6. Dynamic schema custom attributes
      if (getCustomAttributes) {
        const customAttrs = getCustomAttributes();
        for (const attr of customAttrs) {
          suggestions.push({
            label: attr.startsWith("attrs.") ? attr : `attrs.${attr}`,
            kind: monaco.languages.CompletionItemKind.Property,
            insertText: attr.startsWith("attrs.") ? attr : `attrs.${attr}`,
            detail: "Dynamic Event Attribute",
            range,
          });
        }
      }

      return { suggestions };
    },
  });

  // Hover Provider
  monaco.languages.registerHoverProvider(LQL_LANGUAGE_ID, {
    provideHover: (model, position) => {
      const word = model.getWordAtPosition(position);
      if (!word) return null;

      const token = word.word.toLowerCase();

      if (FUNCTION_DOCS[token]) {
        const info = FUNCTION_DOCS[token];
        return {
          range: new monaco.Range(
            position.lineNumber,
            word.startColumn,
            position.lineNumber,
            word.endColumn
          ),
          contents: [
            { value: `**Function: \`${info.syntax}\`**` },
            { value: info.desc },
            { value: `*Example:* \`${info.example}\`` },
          ],
        };
      }

      if (KEYWORD_DOCS[token]) {
        return {
          range: new monaco.Range(
            position.lineNumber,
            word.startColumn,
            position.lineNumber,
            word.endColumn
          ),
          contents: [
            { value: `**LQL Keyword: \`${token}\`**` },
            { value: KEYWORD_DOCS[token] },
          ],
        };
      }

      if (LQL_CANONICAL_FIELDS.includes(token)) {
        return {
          range: new monaco.Range(
            position.lineNumber,
            word.startColumn,
            position.lineNumber,
            word.endColumn
          ),
          contents: [
            { value: `**Canonical Field: \`${token}\`**` },
            { value: "Standard indexed attribute of Loza wide events" },
          ],
        };
      }

      return null;
    },
  });
}
