import type * as MonacoType from "monaco-editor";

export const LQL_LANGUAGE_ID = "lql";

export const LQL_KEYWORDS = [
  "from",
  "where",
  "summarize",
  "by",
  "sort",
  "asc",
  "desc",
  "take",
  "limit",
  "offset",
  "distinct",
  "project",
  "extend",
  "top",
  "timeseries",
  "and",
  "or",
  "not",
  "in",
  "between",
  "as",
  "true",
  "false",
  "null",
];

export const LQL_AGGREGATES = [
  "count",
  "sum",
  "avg",
  "min",
  "max",
  "p50",
  "p95",
  "p99",
  "percentile",
  "dcount",
  "first",
  "last",
];

export const LQL_OPERATORS = [
  "contains",
  "has",
  "startswith",
  "endswith",
  "like",
  "matches",
];

export const LQL_FUNCTIONS = [
  "bin",
  "ago",
  "now",
  "coalesce",
  "if",
  "lower",
  "upper",
  "trim",
  "strlen",
  "concat",
  "format",
  "round",
  "floor",
  "ceil",
  "abs",
];

export const LQL_CANONICAL_FIELDS = [
  "attrs",
  "checkpoints",
  "collector",
  "delivery_attempts",
  "deployment",
  "deployment.environment",
  "deployment.region",
  "duration_ms",
  "environment",
  "error",
  "error.cause",
  "error.code",
  "error.message",
  "error.retriable",
  "error.stack",
  "error.type",
  "errors",
  "event",
  "event_id",
  "event_state",
  "event_version",
  "finished_at",
  "groups",
  "http",
  "http.client_ip",
  "http.host",
  "http.method",
  "http.path",
  "http.route",
  "http.status_code",
  "http.url",
  "http.user_agent",
  "incident_id",
  "kind",
  "level",
  "links",
  "message",
  "method",
  "organization",
  "organization.id",
  "outcome",
  "partial",
  "partial_reason",
  "path",
  "pii",
  "pii.classification",
  "pii.redacted",
  "pii.redaction_policy",
  "processes",
  "redaction",
  "release",
  "request_id",
  "resource",
  "route",
  "sampling",
  "schema_version",
  "sdk",
  "sdk.language",
  "sdk.name",
  "sdk.version",
  "service",
  "source",
  "source.instance_id",
  "source.sdk",
  "span_id",
  "started_at",
  "status_code",
  "tenant",
  "tenant.id",
  "timers",
  "timestamp",
  "trace_flags",
  "trace_id",
  "user",
  "user.email",
  "user.id",
  "user.plan",
  "version",
  "workspace",
  "workspace.id",
];

let isRegistered = false;

export function registerLqlLanguage(monaco: typeof MonacoType): void {
  if (isRegistered) return;
  isRegistered = true;

  monaco.languages.register({ id: LQL_LANGUAGE_ID });

  monaco.languages.setMonarchTokensProvider(LQL_LANGUAGE_ID, {
    defaultToken: "",
    tokenPostfix: ".lql",
    ignoreCase: true,

    keywords: LQL_KEYWORDS,
    aggregates: LQL_AGGREGATES,
    builtinFunctions: LQL_FUNCTIONS,
    operators: LQL_OPERATORS,
    canonicalFields: LQL_CANONICAL_FIELDS,

    brackets: [
      { open: "(", close: ")", token: "delimiter.parenthesis" },
      { open: "[", close: "]", token: "delimiter.bracket" },
      { open: "{", close: "}", token: "delimiter.curly" },
    ],

    tokenizer: {
      root: [
        // Whitespace and comments
        { include: "@whitespace" },

        // Pipe operator
        [/\|/, "delimiter.pipe"],

        // Durations e.g. 5m, 1h, 30s, 500ms, 7d, 2w
        [/\b\d+(?:\.\d+)?(?:ms|s|m|h|d|w)\b/, "number.duration"],

        // Hex / Numbers
        [/0[xX][0-9a-fA-F]+/, "number.hex"],
        [/\d+(?:\.\d+)?/, "number"],

        // Strings
        [/"([^"\\]|\\.)*"/, "string"],
        [/'([^'\\]|\\.)*'/, "string"],

        // Identifiers and keywords
        [
          /[a-zA-Z_][a-zA-Z0-9_.]*/,
          {
            cases: {
              "@keywords": "keyword",
              "@aggregates": "keyword.aggregate",
              "@builtinFunctions": "support.function",
              "@operators": "keyword.operator",
              "@canonicalFields": "variable.name",
              "@default": "identifier",
            },
          },
        ],

        // Delimiters and operators
        [/[{}()[\]]/, "@brackets"],
        [/[;,]/, "delimiter"],
        [/==|!=|<=|>=|<|>|=/, "operator.comparison"],
        [/[+\-*/%]/, "operator.arithmetic"],
      ],

      whitespace: [
        [/[ \t\r\n]+/, "white"],
        [/\/\/.*$/, "comment"],
        [/\/\*/, "comment", "@comment"],
      ],

      comment: [
        [/[^/*]+/, "comment"],
        [/\*\//, "comment", "@pop"],
        [/[/*]/, "comment"],
      ],
    },
  });

  // Language configuration
  monaco.languages.setLanguageConfiguration(LQL_LANGUAGE_ID, {
    comments: {
      lineComment: "//",
      blockComment: ["/*", "*/"],
    },
    brackets: [
      ["(", ")"],
      ["[", "]"],
      ["{", "}"],
    ],
    autoClosingPairs: [
      { open: "(", close: ")" },
      { open: "[", close: "]" },
      { open: "{", close: "}" },
      { open: '"', close: '"', notIn: ["string"] },
      { open: "'", close: "'", notIn: ["string"] },
    ],
  });

  // Register dark theme
  monaco.editor.defineTheme("lozana-dark", {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "keyword", foreground: "C586C0", fontStyle: "bold" },
      { token: "keyword.aggregate", foreground: "4EC9B0", fontStyle: "bold" },
      { token: "support.function", foreground: "DCDCAA" },
      { token: "variable.name", foreground: "9CDCFE" },
      { token: "identifier", foreground: "D4D4D4" },
      { token: "number.duration", foreground: "B5CEA8", fontStyle: "italic" },
      { token: "number", foreground: "B5CEA8" },
      { token: "string", foreground: "CE9178" },
      { token: "delimiter.pipe", foreground: "E5C07B", fontStyle: "bold" },
      { token: "operator", foreground: "569CD6" },
      { token: "comment", foreground: "6A9955", fontStyle: "italic" },
    ],
    colors: {
      "editor.background": "#0c0e14",
      "editor.foreground": "#e2e8f0",
      "editor.lineHighlightBackground": "#161922",
      "editorLineNumber.foreground": "#475569",
      "editorLineNumber.activeForeground": "#94a3b8",
      "editorIndentGuide.background": "#1e293b",
      "editor.selectionBackground": "#33415580",
    },
  });

  // Register light theme
  monaco.editor.defineTheme("lozana-light", {
    base: "vs",
    inherit: true,
    rules: [
      { token: "keyword", foreground: "AF00DB", fontStyle: "bold" },
      { token: "keyword.aggregate", foreground: "0070C1", fontStyle: "bold" },
      { token: "support.function", foreground: "795E26" },
      { token: "variable.name", foreground: "001080" },
      { token: "identifier", foreground: "1E293B" },
      { token: "number.duration", foreground: "098658", fontStyle: "italic" },
      { token: "number", foreground: "098658" },
      { token: "string", foreground: "A31515" },
      { token: "delimiter.pipe", foreground: "D97706", fontStyle: "bold" },
      { token: "operator", foreground: "0000FF" },
      { token: "comment", foreground: "008000", fontStyle: "italic" },
    ],
    colors: {
      "editor.background": "#ffffff",
      "editor.foreground": "#0f172a",
      "editor.lineHighlightBackground": "#f1f5f9",
      "editorLineNumber.foreground": "#94a3b8",
      "editorLineNumber.activeForeground": "#475569",
      "editorIndentGuide.background": "#e2e8f0",
    },
  });
}
