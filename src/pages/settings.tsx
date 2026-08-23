import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useTheme } from "@/components/layout/theme-provider";
import { useAppStore } from "@/stores/app.store";
import { testCollectorConnection, testCortexConnection } from "@/lib/api/client";
import { APP_VERSION } from "@/lib/version";
import {
  Key,
  Server,
  Moon,
  Sun,
  Monitor,
  Save,
  Palette,
  BrainCircuit,
  Activity,
  Layers,
  RotateCcw,
  RefreshCw,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

interface ConnectionTestState {
  testing: boolean;
  tested: boolean;
  ok: boolean;
  latencyMs: number;
  status: number;
  error?: string;
}

function useSynchronizedDraft<T>(storeValue: T) {
  const [previousStoreValue, setPreviousStoreValue] = useState(storeValue);
  const [draft, setDraft] = useState(storeValue);

  if (!Object.is(previousStoreValue, storeValue)) {
    setPreviousStoreValue(storeValue);
    setDraft(storeValue);
  }

  return [draft, setDraft] as const;
}

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const store = useAppStore();

  const [collectorUrl, setCollectorUrl] = useSynchronizedDraft(store.collectorUrl);
  const [cortexUrl, setCortexUrl] = useSynchronizedDraft(store.cortexUrl);
  const [wsUrl, setWsUrl] = useSynchronizedDraft(store.wsUrl);
  const [apiKey, setApiKey] = useSynchronizedDraft(store.apiKey);
  const [activeCollector, setActiveCollector] = useSynchronizedDraft(store.activeCollector);
  const [activeEnvironment, setActiveEnvironment] = useSynchronizedDraft(store.activeEnvironment);
  const [autoRefreshInterval, setAutoRefreshInterval] = useSynchronizedDraft(store.autoRefreshInterval);

  const [collectorTest, setCollectorTest] = useState<ConnectionTestState>({
    testing: false,
    tested: false,
    ok: false,
    latencyMs: 0,
    status: 0,
  });

  const [cortexTest, setCortexTest] = useState<ConnectionTestState>({
    testing: false,
    tested: false,
    ok: false,
    latencyMs: 0,
    status: 0,
  });


  const handleTestCollector = async () => {
    setCollectorTest((s) => ({ ...s, testing: true, tested: false }));
    const result = await testCollectorConnection();
    setCollectorTest({
      testing: false,
      tested: true,
      ok: result.ok,
      latencyMs: result.latencyMs,
      status: result.status,
      error: result.error,
    });
    if (result.ok) {
      toast.success(`Collector online (${result.latencyMs}ms)`);
    } else {
      toast.error(`Collector connection failed: ${result.error || "Offline"}`);
    }
  };

  const handleTestCortex = async () => {
    setCortexTest((s) => ({ ...s, testing: true, tested: false }));
    const result = await testCortexConnection();
    setCortexTest({
      testing: false,
      tested: true,
      ok: result.ok,
      latencyMs: result.latencyMs,
      status: result.status,
      error: result.error,
    });
    if (result.ok) {
      toast.success(`Cortex online (${result.latencyMs}ms)`);
    } else {
      toast.error(`Cortex connection failed: ${result.error || "Offline"}`);
    }
  };

  const handleSave = () => {
    store.setCollectorUrl(collectorUrl);
    store.setCortexUrl(cortexUrl);
    store.setWsUrl(wsUrl);
    store.setApiKey(apiKey);
    store.setActiveCollector(activeCollector);
    store.setActiveEnvironment(activeEnvironment);
    store.setAutoRefreshInterval(autoRefreshInterval);
    toast.success("Settings saved successfully");
  };

  const handleResetDefaults = () => {
    store.resetConnectionDefaults();
    setCollectorUrl("http://localhost:9308");
    setCortexUrl("http://localhost:9312");
    setWsUrl("ws://localhost:9308/ws/tail");
    setApiKey("");
    setActiveCollector("");
    setActiveEnvironment("all");
    setAutoRefreshInterval(0);
    toast.info("Connection settings reset to defaults");
  };

  return (
    <div className="space-y-6 max-w-4xl pb-16">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">System Settings</h1>
          <p className="text-sm text-muted-foreground">
            Configure Loza Collector data-plane, Cortex intelligence engine, tenancy, and UI preferences
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleResetDefaults} className="gap-1.5">
            <RotateCcw className="h-3.5 w-3.5" />
            Reset Defaults
          </Button>
          <Button size="sm" onClick={handleSave} className="gap-1.5">
            <Save className="h-3.5 w-3.5" />
            Save Changes
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Collector Connection Card */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <div className="h-7 w-7 rounded-md bg-primary/10 flex items-center justify-center text-primary">
                  <Server className="h-4 w-4" />
                </div>
                Loza Collector (:9308)
              </CardTitle>
              {collectorTest.tested && (
                <Badge variant={collectorTest.ok ? "default" : "destructive"} className="text-xs">
                  {collectorTest.ok ? `${collectorTest.latencyMs}ms` : "Offline"}
                </Badge>
              )}
            </div>
            <CardDescription className="text-xs">
              Data-plane ingest, LQL execution, NDJSON tail, and schema registry
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Collector HTTP URL
              </label>
              <Input
                value={collectorUrl}
                onChange={(e) => setCollectorUrl(e.target.value)}
                placeholder="http://localhost:9308"
                className="font-mono text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Scoped Collector Tenancy
              </label>
              <Input
                value={activeCollector}
                onChange={(e) => setActiveCollector(e.target.value)}
                placeholder="default (leave blank for unscoped root)"
                className="font-mono text-sm"
              />
              <p className="text-[11px] text-muted-foreground">
                Routes queries to <code>/collectors/{activeCollector || "{id}"}/lql/query</code>
              </p>
            </div>

            <Button
              variant="secondary"
              size="sm"
              onClick={handleTestCollector}
              disabled={collectorTest.testing}
              className="w-full gap-1.5"
            >
              {collectorTest.testing ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Activity className="h-3.5 w-3.5" />
              )}
              {collectorTest.testing ? "Testing Collector..." : "Test Collector Ping"}
            </Button>
          </CardContent>
        </Card>

        {/* Cortex Intelligence Card */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <div className="h-7 w-7 rounded-md bg-purple-500/10 flex items-center justify-center text-purple-400">
                  <BrainCircuit className="h-4 w-4" />
                </div>
                Loza Cortex (:9312)
              </CardTitle>
              {cortexTest.tested && (
                <Badge variant={cortexTest.ok ? "default" : "destructive"} className="text-xs">
                  {cortexTest.ok ? `${cortexTest.latencyMs}ms` : "Offline"}
                </Badge>
              )}
            </div>
            <CardDescription className="text-xs">
              Autonomous incident reconstruction, causal graphs, and topology
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Cortex HTTP URL
              </label>
              <Input
                value={cortexUrl}
                onChange={(e) => setCortexUrl(e.target.value)}
                placeholder="http://localhost:9312"
                className="font-mono text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                WebSocket Stream URL
              </label>
              <Input
                value={wsUrl}
                onChange={(e) => setWsUrl(e.target.value)}
                placeholder="ws://localhost:9308/ws/tail"
                className="font-mono text-sm"
              />
            </div>

            <Button
              variant="secondary"
              size="sm"
              onClick={handleTestCortex}
              disabled={cortexTest.testing}
              className="w-full gap-1.5"
            >
              {cortexTest.testing ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <BrainCircuit className="h-3.5 w-3.5" />
              )}
              {cortexTest.testing ? "Testing Cortex..." : "Test Cortex Ping"}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Tenancy & Environment Card */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <div className="h-7 w-7 rounded-md bg-blue-500/10 flex items-center justify-center text-blue-400">
              <Layers className="h-4 w-4" />
            </div>
            Environment Tenancy & Authentication
          </CardTitle>
          <CardDescription className="text-xs">
            Header injection for multi-tenant isolation (X-Loza-Env & Authorization)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Target Environment
              </label>
              <div className="grid grid-cols-4 gap-2">
                {(["all", "production", "staging", "dev"] as const).map((env) => (
                  <Button
                    key={env}
                    type="button"
                    variant={activeEnvironment === env ? "default" : "outline"}
                    size="sm"
                    onClick={() => setActiveEnvironment(env)}
                    className="capitalize text-xs"
                  >
                    {env}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Key className="h-3.5 w-3.5" />
                API Token / Bearer Key
              </label>
              <Input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="lz_secret_••••••••••••"
                className="font-mono text-sm"
              />
              <p className="text-[11px] text-muted-foreground">
                Stored only for this browser session; never written to durable browser storage.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* UI Preferences Card */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <div className="h-7 w-7 rounded-md bg-amber-500/10 flex items-center justify-center text-amber-400">
              <Palette className="h-4 w-4" />
            </div>
            Appearance & Refresh
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Theme
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { mode: "dark" as const, label: "Dark", icon: Moon },
                  { mode: "light" as const, label: "Light", icon: Sun },
                  { mode: "system" as const, label: "System", icon: Monitor },
                ].map(({ mode, label, icon: Icon }) => (
                  <Button
                    key={mode}
                    type="button"
                    variant={theme === mode ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setTheme(mode);
                      store.setTheme(mode);
                    }}
                    className="gap-1.5 text-xs"
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Auto-Refresh Interval
              </label>
              <div className="grid grid-cols-5 gap-1.5">
                {[
                  { value: 0, label: "Off" },
                  { value: 5, label: "5s" },
                  { value: 15, label: "15s" },
                  { value: 30, label: "30s" },
                  { value: 60, label: "1m" },
                ].map(({ value, label }) => (
                  <Button
                    key={value}
                    type="button"
                    variant={autoRefreshInterval === value ? "default" : "outline"}
                    size="sm"
                    onClick={() => setAutoRefreshInterval(value)}
                    className="text-xs"
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* About Lozana */}
      <Card className="bg-card/50 border-border">
        <CardContent className="py-4 flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            <span>Lozana Wide-Event Observability Suite</span>
            <Badge variant="outline" className="font-mono text-[10px]">
              v{APP_VERSION}
            </Badge>
          </div>
          <span>Loza Ecosystem • Production Ready</span>
        </CardContent>
      </Card>
    </div>
  );
}
