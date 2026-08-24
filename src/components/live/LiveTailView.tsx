import { useState, useEffect, useRef, useMemo } from "react";
import { LiveStreamClient, type StreamStats, type StreamConnectionStatus } from "@/lib/api/streaming";
import { EventDetailDrawer } from "@/components/explorer/EventDetailDrawer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Play,
  Pause,
  Trash2,
  Activity,
  Search,
  ArrowDown,
  Highlighter,
  Zap,
} from "lucide-react";
import type { LozaEvent } from "@/types/event";

export function LiveTailView() {
  const [client] = useState(() => new LiveStreamClient(1000));
  const [status, setStatus] = useState<StreamConnectionStatus>("disconnected");
  const [stats, setStats] = useState<StreamStats>(client.getStats());
  const [events, setEvents] = useState<LozaEvent[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);

  // Filters & Highlights
  const [serviceFilter, setServiceFilter] = useState("");
  const [levelFilter, setLevelFilter] = useState("");
  const [searchRegex, setSearchRegex] = useState("");
  const [highlightKeyword, setHighlightKeyword] = useState("");

  // Inspector Drawer
  const [selectedEvent, setSelectedEvent] = useState<LozaEvent | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const listRef = useRef<HTMLDivElement>(null);

  // Initialize client lifecycle
  useEffect(() => {
    const unsubStatus = client.onStatus((newStatus) => {
      setStatus(newStatus);
      setIsPaused(newStatus === "paused");
    });

    const unsubStats = client.onStats((newStats) => {
      setStats(newStats);
      setEvents(client.getEvents());
    });

    const unsubEvents = client.onEvent(() => {
      setEvents(client.getEvents());
    });

    client.connect(true);

    return () => {
      unsubStatus();
      unsubStats();
      unsubEvents();
      client.disconnect();
    };
  }, [client]);

  // Update client filters when changed
  useEffect(() => {
    client.setFilters({
      service: serviceFilter || undefined,
      level: levelFilter || undefined,
      searchRegex: searchRegex || undefined,
    });
  }, [client, serviceFilter, levelFilter, searchRegex]);

  // Auto-scroll to bottom when new events arrive
  useEffect(() => {
    if (autoScroll && listRef.current && !isPaused) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [events, autoScroll, isPaused]);

  const togglePlayPause = () => {
    if (isPaused) {
      client.resume();
      setIsPaused(false);
    } else {
      client.pause();
      setIsPaused(true);
    }
  };

  const handleClear = () => {
    client.clearBuffer();
    setEvents([]);
  };

  const handleCapacityChange = (cap: number) => {
    client.setCapacity(cap);
  };

  const { displayRegex, searchRegexError } = useMemo(() => {
    if (!searchRegex) {
      return { displayRegex: null, searchRegexError: null };
    }

    try {
      return { displayRegex: new RegExp(searchRegex, "i"), searchRegexError: null };
    } catch (error) {
      return {
        displayRegex: null,
        searchRegexError:
          error instanceof Error ? error.message : "Invalid regular expression",
      };
    }
  }, [searchRegex]);

  // Filter events locally for display
  const displayEvents = useMemo(() => {
    return events.filter((evt) => {
      if (serviceFilter && evt.service !== serviceFilter) return false;
      if (levelFilter && evt.level !== levelFilter) return false;
      if (displayRegex && !displayRegex.test(JSON.stringify(evt))) return false;
      return true;
    });
  }, [events, serviceFilter, levelFilter, displayRegex]);

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] min-h-[500px] bg-card border border-border rounded-xl overflow-hidden shadow-sm">
      {/* Stream Controls Top Bar */}
      <div className="p-3 bg-card/80 border-b border-border space-y-3 flex-shrink-0">
        <div className="flex items-center justify-between flex-wrap gap-2">
          {/* Status & Speed Gauge */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  status === "connected"
                    ? "bg-emerald-400 animate-pulse"
                    : status === "connecting" || status === "reconnecting"
                    ? "bg-amber-400 animate-ping"
                    : status === "paused"
                    ? "bg-amber-400"
                    : "bg-red-400"
                }`}
              />
              <span className="text-xs font-semibold uppercase tracking-wider font-mono capitalize">
                {status}
              </span>
            </div>

            <Badge variant="outline" className="text-xs font-mono text-emerald-400 border-emerald-500/30 gap-1">
              <Zap className="h-3 w-3" />
              {stats.eventsPerSecond} events/sec
            </Badge>

            <Badge variant="secondary" className="text-xs font-mono">
              {stats.bufferSize} / {client.getStats().bufferSize} in buffer
            </Badge>

            {stats.droppedCount > 0 && (
              <Badge variant="destructive" className="text-xs font-mono">
                {stats.droppedCount} dropped (backpressure)
              </Badge>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <Button
              variant={isPaused ? "default" : "outline"}
              size="sm"
              onClick={togglePlayPause}
              className="h-7 text-xs gap-1.5"
            >
              {isPaused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
              {isPaused ? "Resume Stream" : "Pause Stream"}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleClear}
              className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground"
            >
              <Trash2 className="h-3 w-3" />
              Clear
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setAutoScroll((p) => !p)}
              className={`h-7 text-xs gap-1 ${
                autoScroll ? "bg-primary/10 text-primary border-primary/30" : "text-muted-foreground"
              }`}
            >
              <ArrowDown className="h-3 w-3" />
              Auto-Scroll
            </Button>

            {/* Buffer Size Selector */}
            <select
              value={client.getStats().bufferSize || 1000}
              onChange={(e) => handleCapacityChange(Number(e.target.value))}
              className="h-7 rounded bg-background border border-input px-2 text-xs font-mono"
            >
              <option value="500">500 max</option>
              <option value="1000">1,000 max</option>
              <option value="2000">2,000 max</option>
              <option value="5000">5,000 max</option>
            </select>
          </div>
        </div>

        {/* Live Filters & Highlights Row */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-1">
          <div className="relative">
            <Search className="absolute left-2 top-2 h-3 w-3 text-muted-foreground" />
            <Input
              value={searchRegex}
              onChange={(e) => setSearchRegex(e.target.value)}
              placeholder="Regex search filter..."
              aria-invalid={searchRegexError ? "true" : undefined}
              aria-describedby={searchRegexError ? "live-tail-regex-error" : undefined}
              className={`h-7 text-xs pl-7 font-mono ${searchRegexError ? "border-destructive" : ""}`}
            />
          </div>

          <div className="relative">
            <Highlighter className="absolute left-2 top-2 h-3 w-3 text-amber-400" />
            <Input
              value={highlightKeyword}
              onChange={(e) => setHighlightKeyword(e.target.value)}
              placeholder="Highlight keyword (e.g. panic, 500)..."
              className="h-7 text-xs pl-7 font-mono"
            />
          </div>

          <Input
            value={serviceFilter}
            onChange={(e) => setServiceFilter(e.target.value)}
            placeholder="Filter by service..."
            className="h-7 text-xs font-mono"
          />

          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            className="h-7 rounded bg-background border border-input px-2 text-xs font-mono"
          >
            <option value="">All Levels</option>
            <option value="error">Error & Fatal</option>
            <option value="warn">Warn</option>
            <option value="info">Info</option>
            <option value="debug">Debug</option>
          </select>
        </div>
        {searchRegexError && (
          <p id="live-tail-regex-error" role="alert" className="text-xs text-destructive">
            {searchRegexError}
          </p>
        )}
      </div>

      {/* Real-time Streaming Event Log Stream Table */}
      <div
        ref={listRef}
        className="flex-1 overflow-y-auto font-mono text-[11px] p-2 bg-black/40 space-y-0.5"
      >
        {displayEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-2 text-muted-foreground py-20">
            <Activity className="h-8 w-8 animate-pulse text-muted-foreground/50" />
            <p className="text-xs">Waiting for live wide events to stream from Collector (:9308)...</p>
            <span className="text-[10px] text-muted-foreground/60 font-mono">
              Endpoint: /tail (NDJSON)
            </span>
          </div>
        ) : (
          displayEvents.map((evt, idx) => {
            const time = evt.timestamp ? evt.timestamp.substring(11, 19) : "--:--:--";
            const level = String(evt.level || "info").toLowerCase();
            const service = String(evt.service || "sys");
            const eventName = String(evt.event || evt.message || JSON.stringify(evt.attrs || {}));
            const dur = typeof evt.duration_ms === "number" ? evt.duration_ms : undefined;

            const isHighlighted =
              highlightKeyword &&
              JSON.stringify(evt).toLowerCase().includes(highlightKeyword.toLowerCase());

            return (
              <div
                key={evt.event_id || idx}
                onClick={() => {
                  setSelectedEvent(evt);
                  setDrawerOpen(true);
                }}
                className={`flex items-center gap-2 py-1 px-2 rounded cursor-pointer transition-colors hover:bg-white/10 ${
                  isHighlighted
                    ? "bg-amber-500/20 text-amber-200 border-l-2 border-amber-400"
                    : level === "error" || level === "fatal"
                    ? "bg-red-500/10 text-red-300"
                    : level === "warn"
                    ? "bg-amber-500/5 text-amber-300"
                    : "text-foreground/90"
                }`}
              >
                <span className="text-muted-foreground/60 text-[10px] select-none flex-shrink-0 w-16">
                  {time}
                </span>

                <Badge
                  variant="outline"
                  className={`text-[9px] uppercase px-1 py-0 flex-shrink-0 ${
                    level === "error" || level === "fatal"
                      ? "text-red-400 border-red-500/30 bg-red-500/10"
                      : level === "warn"
                      ? "text-amber-400 border-amber-500/30 bg-amber-500/10"
                      : "text-blue-400 border-blue-500/30 bg-blue-500/10"
                  }`}
                >
                  {level}
                </Badge>

                <span className="text-purple-400 font-semibold truncate flex-shrink-0 w-28">
                  {service}
                </span>

                <span className="truncate flex-1 font-mono text-[11px]">{eventName}</span>

                {evt.status_code && (
                  <Badge variant="outline" className="text-[9px] font-mono flex-shrink-0">
                    HTTP {evt.status_code}
                  </Badge>
                )}

                {dur !== undefined && (
                  <Badge variant="outline" className="text-[9px] font-mono text-emerald-400 flex-shrink-0">
                    {dur.toFixed(0)}ms
                  </Badge>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Freeze & Inspect Drawer */}
      <EventDetailDrawer
        event={selectedEvent}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />
    </div>
  );
}
