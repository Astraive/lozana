import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useTheme } from "@/components/layout/theme-provider";
import { cn } from "@/lib/utils";
import { APP_VERSION } from "@/lib/version";
import {
  Key,
  Server,
  Check,
  Moon,
  Sun,
  Monitor,
  Save,
  Info,
  Palette,
  Globe,
} from "lucide-react";

/* -- Theme Option ---------------------------------------------------------- */

function ThemeOption({
  label,
  icon: Icon,
  isActive,
  onClick,
}: {
  label: string;
  icon: typeof Moon;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-2 rounded-lg border p-4 transition-all w-full",
        isActive
          ? "border-primary/50 bg-primary/[0.08] text-primary"
          : "border-border hover:border-border/60 text-muted-foreground hover:text-foreground",
      )}
    >
      <Icon className="h-5 w-5" />
      <span className="text-xs font-medium">{label}</span>
      {isActive && (
        <div className="h-1.5 w-1.5 rounded-full bg-primary" />
      )}
    </button>
  );
}

/* -- Page ------------------------------------------------------------------ */

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [collectorUrl, setCollectorUrl] = useState(
    () => localStorage.getItem("loza-collector-url") || import.meta.env.VITE_LOZANA_API_URL || "http://localhost:9308",
  );
  const [apiKey, setApiKey] = useState(
    () => sessionStorage.getItem("loza-api-key") || localStorage.getItem("loza-api-key") || "",
  );
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const storedKey = localStorage.getItem("loza-api-key");
    if (storedKey) {
      sessionStorage.setItem("loza-api-key", storedKey);
      localStorage.removeItem("loza-api-key");
    }
  }, []);

  function handleSave() {
    const normalizedUrl = normalizeCollectorUrl(collectorUrl);
    if (!normalizedUrl) {
      setError("Collector URL must start with http:// or https://");
      setSaved(false);
      return;
    }
    setError("");
    localStorage.setItem("loza-collector-url", normalizedUrl);
    localStorage.removeItem("loza-api-key");
    if (apiKey) {
      sessionStorage.setItem("loza-api-key", apiKey);
    } else {
      sessionStorage.removeItem("loza-api-key");
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* -- Header -------------------------------------------------------- */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Configure Lozana and your Loza connection
        </p>
      </div>

      {/* -- Connection ---------------------------------------------------- */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-4">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <div className="h-7 w-7 rounded-md bg-accent/10 flex items-center justify-center">
              <Globe className="h-3.5 w-3.5 text-accent" />
            </div>
            Connection
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Server className="h-3 w-3" />
              Collector URL
            </label>
            <Input
              value={collectorUrl}
              onChange={(e) => setCollectorUrl(e.target.value)}
              placeholder={import.meta.env.VITE_LOZANA_API_URL || "http://localhost:9308"}
              className="font-mono text-sm focus-visible:ring-primary/30"
            />
            <p className="text-[11px] text-muted-foreground/60">
              The base URL of your Loza Collector HTTP endpoint
            </p>
            {error && <p className="text-[11px] text-destructive">{error}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Key className="h-3 w-3" />
              API Key
            </label>
            <Input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="lx_live_..."
              className="font-mono text-sm focus-visible:ring-primary/30"
            />
            <p className="text-[11px] text-muted-foreground/60">
              Optional authentication key for secured collectors
            </p>
          </div>

          <Separator />

          <div className="flex items-center gap-3">
            <Button
              onClick={handleSave}
              className="bg-primary text-primary-foreground hover:bg-primary/90 font-medium"
            >
              {saved ? (
                <>
                  <Check className="h-4 w-4 mr-1.5" />
                  Saved
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-1.5" />
                  Save Settings
                </>
              )}
            </Button>
            {saved && (
              <span className="text-xs text-primary animate-in fade-in duration-200">
                Settings saved
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* -- Appearance ---------------------------------------------------- */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-4">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <div className="h-7 w-7 rounded-md bg-[#FFF1F1]/10 flex items-center justify-center">
              <Palette className="h-3.5 w-3.5 text-[#FFF1F1]" />
            </div>
            Appearance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Theme
            </label>
            <div className="grid grid-cols-3 gap-3">
              <ThemeOption
                label="Dark"
                icon={Moon}
                isActive={theme === "dark"}
                onClick={() => setTheme("dark")}
              />
              <ThemeOption
                label="Light"
                icon={Sun}
                isActive={theme === "light"}
                onClick={() => setTheme("light")}
              />
              <ThemeOption
                label="System"
                icon={Monitor}
                isActive={theme === "system"}
                onClick={() => setTheme("system")}
              />
            </div>
            <p className="text-[11px] text-muted-foreground/60">
              {theme === "system"
                ? "Follows your operating system preference"
                : theme === "dark"
                  ? "Optimized for low-light environments"
                  : "High-contrast light theme"}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* -- About --------------------------------------------------------- */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-4">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <div className="h-7 w-7 rounded-md bg-primary/10 flex items-center justify-center">
              <Info className="h-3.5 w-3.5 text-primary" />
            </div>
            About
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between py-1">
            <span className="text-sm text-muted-foreground">Lozana Version</span>
            <Badge
              variant="outline"
              className="text-[10px] font-mono text-primary border-primary/30"
            >
              v{APP_VERSION}
            </Badge>
          </div>
          <Separator />
          <div className="flex items-center justify-between py-1">
            <span className="text-sm text-muted-foreground">Spec Version</span>
            <Badge
              variant="outline"
              className="text-[10px] font-mono text-accent border-accent/30"
            >
              v1
            </Badge>
          </div>
          <Separator />
          <div className="flex items-center justify-between py-1">
            <span className="text-sm text-muted-foreground">Framework</span>
            <span className="text-xs font-mono text-muted-foreground">
              React + Vite + Tailwind
            </span>
          </div>
          <Separator />
          <p className="text-xs text-muted-foreground/60 pt-2">
            Lozana is the observability dashboard for Loza wide events.
            Connect to a Loza Collector to start exploring your system.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function normalizeCollectorUrl(value: string): string {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return "";
    }
    url.hash = "";
    return url.toString().replace(/\/$/, "");
  } catch {
    return "";
  }
}
