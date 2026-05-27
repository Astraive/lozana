import { Routes, Route } from "react-router-dom";
import { Providers } from "./providers";
import { AppShell } from "@/components/layout/app-shell";
import { ThemeProvider } from "@/components/layout/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import OverviewPage from "@/pages/overview";
import ExplorePage from "@/pages/explore";
import TracesPage from "@/pages/traces";
import ErrorsPage from "@/pages/errors";
import ServicesPage from "@/pages/services";
import DashboardsPage from "@/pages/dashboards";
import QueriesPage from "@/pages/queries";
import AlertsPage from "@/pages/alerts";
import CollectorPage from "@/pages/collector";
import SettingsPage from "@/pages/settings";
import NotFoundPage from "@/pages/not-found";

export default function App() {
  return (
    <Providers>
      <ThemeProvider>
        <AppShell>
          <ErrorBoundary>
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
          </ErrorBoundary>
        </AppShell>
        <Toaster />
      </ThemeProvider>
    </Providers>
  );
}
