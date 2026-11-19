import { lazy, Suspense, type ReactNode } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import { lazy, Suspense } from "react";
import { Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";
import { Providers } from "./providers";
import { AppShell } from "@/components/layout/app-shell";
import { ThemeProvider } from "@/components/layout/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { isAuthenticated } from "@/lib/auth/auth.client";
import { useAppStore } from "@/stores/app.store";

const OverviewPage = lazy(() => import("@/pages/overview"));
const ExplorePage = lazy(() => import("@/pages/explore"));
const TracesPage = lazy(() => import("@/pages/traces"));
const ErrorsPage = lazy(() => import("@/pages/errors"));
const ServicesPage = lazy(() => import("@/pages/services"));
const DashboardsPage = lazy(() => import("@/pages/dashboards"));
const QueriesPage = lazy(() => import("@/pages/queries"));
const AlertsPage = lazy(() => import("@/pages/alerts"));
const CollectorPage = lazy(() => import("@/pages/collector"));
const IncidentsPage = lazy(() => import("@/pages/incidents"));
const SettingsPage = lazy(() => import("@/pages/settings"));
const NotFoundPage = lazy(() => import("@/pages/not-found"));

function PageLoader() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-current border-t-transparent" />
    </div>
  );
}

// `App` itself is outside the route elements, so its `children` reference is
// stable across navigation. Derive the reset key from the router location so
// the boundary actually clears when the user changes routes.
function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  return <ErrorBoundary resetKey={pathname}>{children}</ErrorBoundary>;
/**
 * Client-side route gating (defense in depth). The backend is authoritative
 * for validating the API key; this guard only redirects users who have not
 * configured a collector credential. Settings stays public so a credential
 * can be entered there. Cortex is a separate trust domain with its own key.
 */
function RequireAuth() {
  // Subscribe to the credential so the guard re-evaluates when it changes.
  const apiKey = useAppStore((state) => state.apiKey);
  const location = useLocation();

  if (!apiKey || !isAuthenticated()) {
    return <Navigate to="/settings" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}

export default function App() {
  return (
    <Providers>
      <ThemeProvider>
        <AppShell>
          <RoutedErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                {/* Public: credential configuration entry point. */}
                <Route path="/settings" element={<SettingsPage />} />
                <Route element={<RequireAuth />}>
                  <Route path="/" element={<OverviewPage />} />
                  <Route path="/explore" element={<ExplorePage />} />
                  <Route path="/traces" element={<TracesPage />} />
                  <Route path="/errors" element={<ErrorsPage />} />
                  <Route path="/services" element={<ServicesPage />} />
                  <Route path="/dashboards" element={<DashboardsPage />} />
                  <Route path="/queries" element={<QueriesPage />} />
                  <Route path="/alerts" element={<AlertsPage />} />
                  <Route path="/collector" element={<CollectorPage />} />
                  <Route path="/incidents" element={<IncidentsPage />} />
                </Route>
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </Suspense>
          </RoutedErrorBoundary>
        </AppShell>
        <Toaster />
      </ThemeProvider>
    </Providers>
  );
}
