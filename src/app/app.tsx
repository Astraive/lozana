import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import { Providers } from "./providers";
import { AppShell } from "@/components/layout/app-shell";
import { ThemeProvider } from "@/components/layout/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const OverviewPage = lazy(() => import("@/pages/overview"));
const ExplorePage = lazy(() => import("@/pages/explore"));
const TracesPage = lazy(() => import("@/pages/traces"));
const ErrorsPage = lazy(() => import("@/pages/errors"));
const ServicesPage = lazy(() => import("@/pages/services"));
const DashboardsPage = lazy(() => import("@/pages/dashboards"));
const QueriesPage = lazy(() => import("@/pages/queries"));
const AlertsPage = lazy(() => import("@/pages/alerts"));
const CollectorPage = lazy(() => import("@/pages/collector"));
const SettingsPage = lazy(() => import("@/pages/settings"));
const NotFoundPage = lazy(() => import("@/pages/not-found"));

function PageLoader() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-current border-t-transparent" />
    </div>
  );
}

export default function App() {
  return (
    <Providers>
      <ThemeProvider>
        <AppShell>
          <ErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<OverviewPage />} />
                <Route path="/explore" element={<ExplorePage />} />
                <Route path="/traces" element={<TracesPage />} />
                <Route path="/errors" element={<ErrorsPage />} />
                <Route path="/services" element={<ServicesPage />} />
                <Route path="/dashboards" element={<DashboardsPage />} />
                <Route path="/queries" element={<QueriesPage />} />
                <Route path="/alerts" element={<AlertsPage />} />
                <Route path="/collector" element={<CollectorPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </Suspense>
          </ErrorBoundary>
        </AppShell>
        <Toaster />
      </ThemeProvider>
    </Providers>
  );
}
