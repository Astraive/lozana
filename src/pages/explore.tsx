import { useState, useCallback, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import Editor, { type OnMount } from "@monaco-editor/react";
import type * as MonacoType from "monaco-editor";
import { LqlQueryError } from "@/lib/api/events";
import { useQueryEvents } from "@/lib/hooks";
import { useQueryStore } from "@/stores/query.store";
import { useAppStore } from "@/stores/app.store";
import { registerLqlLanguage, LQL_LANGUAGE_ID } from "@/lib/lql/monaco-lql";
import { registerLqlCompletionProvider } from "@/lib/lql/completion-provider";
import { VisualQueryBuilder } from "@/components/lql/VisualQueryBuilder";
import { QuerySnippetsDrawer } from "@/components/lql/QuerySnippetsDrawer";
import { QueryHistoryDrawer } from "@/components/lql/QueryHistoryDrawer";
import { FacetSidebar } from "@/components/explorer/FacetSidebar";
import { EventDataGrid } from "@/components/explorer/EventDataGrid";
import { EventDetailDrawer } from "@/components/explorer/EventDetailDrawer";
import { EventDiffModal } from "@/components/explorer/EventDiffModal";
import { TimeSeriesChart } from "@/components/charts/TimeSeriesChart";
import { BarChart } from "@/components/charts/BarChart";
import { PieChart } from "@/components/charts/PieChart";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Play,
  Terminal,
  Zap,
  History,
  Sparkles,
  Table as TableIcon,
  LineChart,
  BarChart2,
  PieChart as PieIcon,
  FileJson,
  Download,
  Share2,
  Plus,
  X,
  Pin,
  Split,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import type { LozaEvent } from "@/types/event";

export default function ExplorePage() {
  const [searchParams] = useSearchParams();
  const urlQuery = searchParams.get("q") ?? "";

  return <ExploreWorkspace key={urlQuery} urlQuery={urlQuery} />;
}

function ExploreWorkspace({ urlQuery }: { urlQuery: string }) {
  const [, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { theme } = useAppStore();

  const {
    tabs,
    activeTabId,
    addTab,
    closeTab,
    setActiveTabId,
    updateActiveTabQuery,
    addHistoryEntry,
    getActiveQuery,
  } = useQueryStore();

  const activeQuery = getActiveQuery();

  const initialQuery = urlQuery || activeQuery;
  const [submittedQuery, setSubmittedQuery] = useState(initialQuery);
  const [queryEnabled, setQueryEnabled] = useState(Boolean(initialQuery));
  const [isVisualMode, setIsVisualMode] = useState(false);
  const [activeView, setActiveView] = useState<"table" | "timeseries" | "bar" | "pie" | "json">("table");

  // Drawers & Modals
  const [snippetsOpen, setSnippetsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<LozaEvent | Record<string, unknown> | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [diffEvents, setDiffEvents] = useState<(LozaEvent | Record<string, unknown>)[]>([]);
  const [diffModalOpen, setDiffModalOpen] = useState(false);

  const editorRef = useRef<MonacoType.editor.IStandaloneCodeEditor | null>(null);

  // TanStack Query for execution
  const queryResult = useQueryEvents(submittedQuery, {}, 1000, queryEnabled);

  // Keep the active tab aligned with a query supplied by navigation.
  useEffect(() => {
    if (urlQuery && urlQuery !== activeQuery) {
      updateActiveTabQuery(urlQuery);
    }
  }, [urlQuery, activeQuery, updateActiveTabQuery]);

  // Execute query handler
  const handleExecute = useCallback(() => {
    const current = getActiveQuery().trim();
    if (!current) {
      setQueryEnabled(false);
      return;
    }
    setSubmittedQuery(current);
    setQueryEnabled(true);
    setSearchParams({ q: current });
  }, [getActiveQuery, setSearchParams]);

  // Record history on successful/failed query result
  useEffect(() => {
    if (queryResult.isSuccess && queryResult.data) {
      addHistoryEntry({
        query: submittedQuery,
        durationMs: queryResult.data.duration_ms || 0,
        rowCount: queryResult.data.rows?.length || 0,
      });
    } else if (queryResult.isError) {
      addHistoryEntry({
        query: submittedQuery,
        durationMs: 0,
        rowCount: 0,
        error: queryResult.error?.message || "Execution error",
      });
    }
  }, [queryResult.data, queryResult.isSuccess, queryResult.isError, queryResult.error, submittedQuery, addHistoryEntry]);

  // Monaco Editor Mount
  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    registerLqlLanguage(monaco);
    registerLqlCompletionProvider(monaco);

    // Keyboard shortcut: Ctrl+Enter or Cmd+Enter to execute
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      handleExecute();
    });
  };

  const rows = queryResult.data?.rows ?? [];
  const columns = queryResult.data?.columns ?? [];

  // Filter injection from Facet Sidebar
  const handleAddFilterFromFacet = (field: string, operator: "=" | "!=", value: string) => {
    const isNum = !isNaN(Number(value)) && value.trim() !== "";
    const filterClause = `where ${field} ${operator} ${isNum ? value : `"${value}"`}`;
    const newQuery = `${activeQuery.trim()} | ${filterClause}`;
    updateActiveTabQuery(newQuery);
    if (editorRef.current) {
      editorRef.current.setValue(newQuery);
    }
    toast.success(`Filter added: ${filterClause}`);
  };

  const handleGroupByFromFacet = (field: string) => {
    const newQuery = `${activeQuery.trim()} | summarize count() by ${field}`;
    updateActiveTabQuery(newQuery);
    if (editorRef.current) {
      editorRef.current.setValue(newQuery);
    }
    toast.success(`Grouped by ${field}`);
  };

  const handleExportCsv = () => {
    if (rows.length === 0) return;
    const header = columns.join(",");
    const csvRows = rows.map((r) =>
      columns.map((c) => JSON.stringify(r[c] ?? "")).join(",")
    );
    const blob = new Blob([[header, ...csvRows].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `loza-query-export-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Exported results to CSV");
  };

  const handleExportJson = () => {
    if (rows.length === 0) return;
    const blob = new Blob([JSON.stringify(rows, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `loza-query-export-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Exported results to JSON");
  };

  const handleShareQuery = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    toast.success("Share link copied to clipboard");
  };

  const handleToggleDiff = (event: LozaEvent | Record<string, unknown>) => {
    const eventId = String(event.event_id || "");
    setDiffEvents((prev) => {
      const exists = prev.some((e) => String(e.event_id || "") === eventId);
      if (exists) {
        return prev.filter((e) => String(e.event_id || "") !== eventId);
      }
      if (prev.length >= 2) {
        return [prev[1], event];
      }
      return [...prev, event];
    });
  };

  // Convert row data to chart-friendly format for time series
  const timeSeriesData = rows.map((r) => ({
    timestamp: String(r.bin || r.bin_timestamp || r.timestamp || ""),
    value: Number(r.event_count || r.count_ || r.count || r.p95_duration_ms || r.duration_ms || 0),
    service: String(r.service || "events"),
  }));

  const barData = rows.slice(0, 20).map((r) => ({
    name: String(r.service || r.route || r.status_code || r.error_type || "Item"),
    value: Number(r.event_count || r.count_ || r.count || r.duration_ms || 0),
  }));

  const pieData = rows.slice(0, 10).map((r) => ({
    name: String(r.service || r.level || r.status_code || r.outcome || "Category"),
    value: Number(r.event_count || r.count_ || r.count || 1),
  }));

  const diagnostics =
    queryResult.error instanceof LqlQueryError ? queryResult.error.diagnostics : [];

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] space-y-3">
      {/* Top Header & Tab Bar */}
      <div className="flex items-center justify-between border-b border-border pb-2 px-1">
        <div className="flex items-center gap-1.5 overflow-x-auto flex-1 mr-4">
          {tabs.map((t) => (
            <div
              key={t.id}
              onClick={() => setActiveTabId(t.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-t-md text-xs font-medium cursor-pointer border border-b-0 transition-colors ${
                t.id === activeTabId
                  ? "bg-card text-foreground border-border shadow-sm"
                  : "bg-muted/40 text-muted-foreground border-transparent hover:bg-muted/70"
              }`}
            >
              <Terminal className="h-3 w-3 text-primary" />
              <span>{t.title}</span>
              {t.isPinned && <Pin className="h-2.5 w-2.5 text-primary" />}
              {tabs.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    closeTab(t.id);
                  }}
                  className="text-muted-foreground hover:text-destructive p-0.5 rounded"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}

          <Button
            variant="ghost"
            size="sm"
            onClick={() => addTab()}
            className="h-7 text-xs px-2 gap-1 text-muted-foreground hover:text-foreground"
          >
            <Plus className="h-3.5 w-3.5" />
            New Tab
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsVisualMode((prev) => !prev)}
            className={`h-7 text-xs gap-1.5 ${isVisualMode ? "bg-primary/20 text-primary border-primary/40" : ""}`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            {isVisualMode ? "Monaco Mode" : "Visual Builder"}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setSnippetsOpen(true)}
            className="h-7 text-xs gap-1.5"
          >
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Snippets
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setHistoryOpen(true)}
            className="h-7 text-xs gap-1.5"
          >
            <History className="h-3.5 w-3.5" />
            History
          </Button>

          {diffEvents.length > 0 && (
            <Button
              variant="default"
              size="sm"
              onClick={() => setDiffModalOpen(true)}
              className="h-7 text-xs gap-1.5 bg-purple-600 hover:bg-purple-700 text-white"
            >
              <Split className="h-3.5 w-3.5" />
              Compare ({diffEvents.length})
            </Button>
          )}
        </div>
      </div>

      {/* Query Input Section (Monaco or Visual Builder) */}
      {isVisualMode ? (
        <VisualQueryBuilder
          initialQuery={activeQuery}
          onApply={(lql) => {
            updateActiveTabQuery(lql);
            setIsVisualMode(false);
            if (editorRef.current) {
              editorRef.current.setValue(lql);
            }
            handleExecute();
          }}
          onCancel={() => setIsVisualMode(false)}
        />
      ) : (
        <Card className="bg-card border-border shadow-sm flex-shrink-0">
          <CardContent className="p-3 space-y-2">
            <div className="h-28 rounded-md overflow-hidden border border-border/80">
              <Editor
                height="100%"
                language={LQL_LANGUAGE_ID}
                theme={theme === "light" ? "lozana-light" : "lozana-dark"}
                value={activeQuery}
                onChange={(val) => updateActiveTabQuery(val || "")}
                onMount={handleEditorDidMount}
                options={{
                  minimap: { enabled: false },
                  fontSize: 13,
                  lineNumbers: "on",
                  lineNumbersMinChars: 3,
                  scrollBeyondLastLine: false,
                  wordWrap: "on",
                  automaticLayout: true,
                  padding: { top: 6, bottom: 6 },
                  suggestOnTriggerCharacters: true,
                }}
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-3">
                <Button
                  onClick={handleExecute}
                  disabled={queryResult.isLoading}
                  size="sm"
                  className="h-8 gap-1.5 bg-primary text-primary-foreground font-semibold"
                >
                  {queryResult.isLoading ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Play className="h-3.5 w-3.5 fill-current" />
                  )}
                  {queryResult.isLoading ? "Running..." : "Run LQL"}
                </Button>

                <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 rounded border border-border bg-muted/60 text-[10px] font-mono">
                    Ctrl
                  </kbd>
                  <span>+</span>
                  <kbd className="px-1.5 py-0.5 rounded border border-border bg-muted/60 text-[10px] font-mono">
                    Enter
                  </kbd>
                </span>
              </div>

              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                {queryResult.data?.duration_ms !== undefined && (
                  <div className="flex items-center gap-1 font-mono">
                    <Zap className="h-3.5 w-3.5 text-amber-400" />
                    <span>{queryResult.data.duration_ms}ms</span>
                  </div>
                )}
                <span className="font-mono">{rows.length} rows</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Diagnostics / Error Banner */}
      {diagnostics.length > 0 && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-xs space-y-1">
          <div className="flex items-center gap-1.5 text-red-400 font-semibold">
            <AlertTriangle className="h-4 w-4" />
            <span>LQL Diagnostic Errors</span>
          </div>
          {diagnostics.map((d, i) => (
            <p key={i} className="font-mono text-red-300 pl-5">
              • {d.message}
            </p>
          ))}
        </div>
      )}

      {/* Results Workspace: Facet Sidebar + Visualizations */}
      <div className="flex-1 flex gap-3 overflow-hidden">
        {/* Facet Discovery Sidebar */}
        <FacetSidebar
          events={rows}
          onAddFilter={handleAddFilterFromFacet}
          onGroupBy={handleGroupByFromFacet}
        />

        {/* Center Results Container */}
        <div className="flex-1 flex flex-col overflow-hidden bg-card border border-border rounded-lg shadow-sm">
          {/* Result Toolbar */}
          <div className="flex items-center justify-between p-2 border-b border-border bg-card/60 flex-shrink-0">
            {/* View switcher */}
            <div className="flex items-center gap-1 bg-muted p-0.5 rounded-md">
              {[
                { key: "table" as const, label: "Table", icon: TableIcon },
                { key: "timeseries" as const, label: "Time Series", icon: LineChart },
                { key: "bar" as const, label: "Bar", icon: BarChart2 },
                { key: "pie" as const, label: "Pie", icon: PieIcon },
                { key: "json" as const, label: "JSON", icon: FileJson },
              ].map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setActiveView(key)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded font-medium transition-colors ${
                    activeView === key
                      ? "bg-background shadow text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="h-3 w-3" />
                  <span>{label}</span>
                </button>
              ))}
            </div>

            {/* Export & Actions */}
            <div className="flex items-center gap-1.5">
              <Button variant="outline" size="sm" onClick={handleExportCsv} className="h-7 text-xs gap-1">
                <Download className="h-3 w-3" />
                CSV
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportJson} className="h-7 text-xs gap-1">
                <Download className="h-3 w-3" />
                JSON
              </Button>
              <Button variant="outline" size="sm" onClick={handleShareQuery} className="h-7 text-xs gap-1">
                <Share2 className="h-3 w-3" />
                Share
              </Button>
            </div>
          </div>

          {/* View Content Area */}
          <div className="flex-1 overflow-auto p-2">
            {activeView === "table" && (
              <EventDataGrid
                events={rows}
                columns={columns}
                onSelectEvent={(evt) => {
                  setSelectedEvent(evt);
                  setDrawerOpen(true);
                }}
                onViewTrace={(traceId) => navigate(`/traces?trace_id=${encodeURIComponent(traceId)}`)}
                selectedEventId={selectedEvent ? String(selectedEvent.event_id || "") : undefined}
                selectedForDiff={diffEvents}
                onToggleDiffSelect={handleToggleDiff}
              />
            )}

            {activeView === "timeseries" && (
              <div className="h-full min-h-[350px] p-4 flex flex-col">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Time Series Chart
                </h3>
                <div className="flex-1">
                  <TimeSeriesChart
                    data={timeSeriesData}
                    xField="timestamp"
                    yField="value"
                    height={320}
                  />
                </div>
              </div>
            )}

            {activeView === "bar" && (
              <div className="h-full min-h-[350px] p-4 flex flex-col">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Bar Aggregation Chart
                </h3>
                <div className="flex-1">
                  <BarChart
                    data={barData}
                    xField="name"
                    yField="value"
                    height={320}
                  />
                </div>
              </div>
            )}

            {activeView === "pie" && (
              <div className="h-full min-h-[350px] p-4 flex flex-col">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Distribution Pie Chart
                </h3>
                <div className="flex-1">
                  <PieChart
                    data={pieData}
                    height={320}
                  />
                </div>
              </div>
            )}

            {activeView === "json" && (
              <pre className="p-4 rounded-lg bg-muted/40 font-mono text-xs text-foreground overflow-auto h-full leading-relaxed border border-border">
                {JSON.stringify(rows, null, 2)}
              </pre>
            )}
          </div>
        </div>
      </div>

      {/* Drawers and Modals */}
      <QuerySnippetsDrawer
        open={snippetsOpen}
        onOpenChange={setSnippetsOpen}
        onSelectSnippet={(q) => {
          updateActiveTabQuery(q);
          if (editorRef.current) {
            editorRef.current.setValue(q);
          }
          handleExecute();
        }}
      />

      <QueryHistoryDrawer
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        onSelectQuery={(q) => {
          updateActiveTabQuery(q);
          if (editorRef.current) {
            editorRef.current.setValue(q);
          }
          handleExecute();
        }}
      />

      <EventDetailDrawer
        event={selectedEvent}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onViewTrace={(traceId) => navigate(`/traces?trace_id=${encodeURIComponent(traceId)}`)}
        onReconstructCortex={(id) => navigate(`/incidents?incident_id=${encodeURIComponent(id)}`)}
        onAddToDiff={handleToggleDiff}
      />

      <EventDiffModal
        events={diffEvents}
        open={diffModalOpen}
        onOpenChange={setDiffModalOpen}
        onClearDiff={() => setDiffEvents([])}
      />
    </div>
  );
}
