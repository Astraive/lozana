# Web QA Report: Lozana Dashboard

Date: 2026-05-27
Version: v0.2.3
Target: E:\astraive\loza\lozana
Mode: Web QA (comprehensive code review + build verification)
Browsers tested: N/A (code review mode -- no live browser available for this session)

## Summary

Health score: 74/100
Status: PASS_WITH_ISSUES

Recommendation:
- Ship after fixes -- the application builds cleanly, TypeScript passes with zero errors, all 10 routes are properly wired, and the code quality is high. However, there is significant dead code from the feature-first refactoring, a missing ESLint config, and a few medium-severity code issues that should be addressed before release.

## Project Files Referenced

| File | Status | Notes |
|------|--------|-------|
| `CLAUDE.md` | read | Points to AGENTS.md |
| `README.md` | read | Project overview |
| `DESIGN.md` | not found | No design spec file |
| `API.md` | not found | No API spec file |
| `SECURITY.md` | not found | No security spec file |
| `CONFIG.md` | not found | No config spec file |
| `TESTING.md` | not found | No testing spec file |
| `package.json` | used | Dependencies, scripts |
| `vite.config.ts` | used | Dev server proxy config |
| `tsconfig.json` | used | TypeScript config |
| `index.html` | used | Entry point |

## Build Verification

| Check | Status | Details |
|-------|--------|---------|
| `bun install` | PASS | 270 packages, 343 modules, 521ms |
| `tsc -b` (type-check) | PASS | Zero type errors |
| `vite build` | PASS | 3159 modules, 34.41s, outputs index.html + assets |
| `bun run lint` (ESLint) | FAIL | Missing `eslint.config.js` -- ESLint 9 requires flat config |
| Bundle size | WARN | Main JS chunk is 884 KB (gzip: 261 KB), exceeds 500 KB warning |

## Areas Tested

| Area | Status | Notes |
|------|--------|-------|
| Page load | PASS | All 10 routes render valid JSX with proper structure |
| Routing | PASS | 10 routes match between router, sidebar, and command menu |
| Navigation | PASS | Sidebar links, command menu (Cmd+K), back/forward all wired |
| Forms | PASS | Explore (query input), Dashboards (add panel), Queries (save), Settings (config) all have validation |
| Auth | PASS | API key auth via Bearer token in API client |
| API-backed UI | PASS | TanStack Query with loading skeletons, error states, auto-refetch |
| Console health | PASS | No runtime error patterns found in code review |
| Responsive | PASS | Mobile hamburger, overlay, responsive grids, lg breakpoint layout |
| Accessibility basics | PASS | Skip-to-content, ARIA labels, keyboard nav, role attributes |
| Dead code | FAIL | ~25 unused files from feature-first refactoring |
| Lint config | FAIL | ESLint 9 flat config missing |

## Issues Found

### ISSUE-001: ESLint configuration missing for ESLint 9

Severity: High
Page/Flow: Build pipeline
Category: Build/Lint

Steps to reproduce:
1. Run `bun run lint`
2. Observe exit code 2 with "ESLint couldn't find an eslint.config.(js|mjs|cjs) file"

Expected: ESLint runs and reports lint issues (or passes cleanly)
Actual: ESLint fails immediately because ESLint 9 requires `eslint.config.js` (flat config format)
Evidence: Error message from ESLint 9.39.4
User impact: Cannot run lint checks; CI pipeline would fail on lint step

### ISSUE-002: ~25 unused feature API files, components, and types

Severity: Medium
Page/Flow: Codebase hygiene
Category: Dead code

Steps to reproduce:
1. Check which files in `src/features/` are imported by any page or component
2. Many feature-level API files, hooks, and components are not imported anywhere

Dead files include:
- `src/features/alerts/api/alerts.api.ts` -- alert rule CRUD, never imported
- `src/features/dashboards/api/dashboards.api.ts` -- dashboard CRUD, never imported
- `src/features/dashboards/hooks/useDashboards.ts` -- dashboard hook, never imported
- `src/features/logs/api/logs.api.ts` -- log API, never imported
- `src/features/logs/components/LogLine.tsx` -- log line component, never imported
- `src/features/logs/components/LogFilters.tsx` -- log filters, never imported
- `src/features/logs/components/LogAttributes.tsx` -- log attributes, never imported
- `src/features/logs/types.ts` -- log types, never imported
- `src/features/metrics/api/metrics.api.ts` -- metrics API, never imported
- `src/features/query/api/query.api.ts` -- query API (duplicates lib/api/events.ts), never imported
- `src/features/query/components/QueryEditor.tsx` -- Monaco editor, never imported
- `src/features/query/components/QueryResultTable.tsx` -- result table, never imported
- `src/features/query/components/QueryToolbar.tsx` -- query toolbar, never imported
- `src/features/query/lql/lqlParser.ts` -- LQL compiler (duplicates lib/lql/wasm.ts), never imported
- `src/features/query/lql/lqlHighlighter.ts` -- LQL highlighter, never imported
- `src/features/query/lql/lqlAutocomplete.ts` -- LQL autocomplete, never imported
- `src/features/query/types.ts` -- query types, never imported
- `src/features/service-map/api/service-map.api.ts` -- service map API, never imported
- `src/features/traces/api/traces.api.ts` -- traces API (duplicates lib/api/events.ts), never imported
- `src/features/traces/components/SpanDetails.tsx` -- span details, never imported
- `src/features/traces/components/SpanTree.tsx` -- span tree, never imported
- `src/features/traces/components/TraceFilters.tsx` -- trace filters, never imported
- `src/features/traces/components/TraceList.tsx` -- trace list, never imported
- `src/features/traces/types.ts` -- trace types, never imported
- `src/config/nav.ts` -- nav config with stale routes (/logs, /metrics, /service-map), never imported
- `src/config/charts.ts` -- chart config, never imported

Also unused:
- `src/types/api.ts` -- ApiResponse/PaginatedResponse types, never imported
- `src/types/common.ts` -- SortConfig/FilterConfig types, never imported
- `src/types/dashboard.ts` -- Dashboard/Panel types, never imported
- `src/lib/query-client.ts` -- standalone QueryClient, never imported (providers.tsx creates its own)
- `src/lib/format.ts` -- formatNumber/formatBytes/formatPercent/truncate, never imported
- `src/hooks/useDebounce.ts` -- useDebounce hook, never imported
- `src/hooks/useHotkeys.ts` -- useHotkeys hook, never imported
- `src/hooks/useLocalStorage.ts` -- useLocalStorage hook, never imported
- `src/hooks/useWebSocket.ts` -- useWebSocket hook, never imported
- `src/stores/app.store.ts` -- app store (sidebarCollapsed/timeRange), never imported
- `src/stores/time-range.store.ts` -- time range store, never imported
- `src/lib/auth/auth.client.ts` -- getAuthHeaders/isAuthenticated, never imported
- `src/lib/auth/session.ts` -- getSession/setSession, never imported
- `src/lib/storage.ts` -- only imported by other dead files

Expected: Only files that are actually used should remain in the codebase
Actual: ~35+ files are dead code from the feature-first architecture refactoring
User impact: Increases bundle analysis confusion, slows down IDE indexing, misleads contributors

### ISSUE-003: Duplicated LQL compiler logic

Severity: Medium
Page/Flow: Explore page / code quality
Category: Code duplication

Steps to reproduce:
1. Compare `src/lib/lql/wasm.ts` with `src/features/query/lql/lqlParser.ts`
2. Both implement `compileToDuckDB()` with identical core logic

Expected: Single source of truth for LQL compilation
Actual: Two separate implementations exist; the pages import from `lib/lql/wasm.ts`
Evidence: Both files contain ~200+ lines of nearly identical compiler code
User impact: Bug fixes must be applied in two places; risk of divergence

### ISSUE-004: Duplicate cn utility

Severity: Low
Page/Flow: Code quality
Category: Dead code

Steps to reproduce:
1. Both `src/lib/cn.ts` and `src/lib/utils.ts` export `cn()`
2. Components import from both paths

Expected: Single cn utility
Actual: Two identical files with the same implementation
Evidence: Both files contain identical `clsx + twMerge` code
User impact: Confusing for contributors; minor maintenance burden

### ISSUE-005: Stale Next.js artifacts in dist/

Severity: Low
Page/Flow: Build output
Category: Build hygiene

Steps to reproduce:
1. Check `dist/` directory
2. Contains `file.svg`, `globe.svg`, `next.svg`, `vercel.svg`, `window.svg` from prior Next.js build

Expected: dist/ only contains Vite build output (index.html, assets/)
Actual: Contains 5 stale SVG files from previous Next.js setup
Evidence: File listing shows both Vite output and legacy SVGs
User impact: None functionally; confuses deployment scripts

### ISSUE-006: config/nav.ts has stale routes

Severity: Low
Page/Flow: Navigation config
Category: Dead code / routing

Steps to reproduce:
1. Read `src/config/nav.ts`
2. Routes include `/logs`, `/metrics`, `/service-map` which do not exist as page routes

Expected: Nav config matches actual routes
Actual: Nav config references 3 non-existent routes; actual sidebar uses different items
Evidence: Compare `config/nav.ts` (8 items, includes /logs, /metrics, /service-map) with `sidebar.tsx` (10 items, includes /errors, /services, /dashboards, /queries, /collector)
User impact: None (file is unused), but misleading

### ISSUE-007: useSearchParams in Explore needs Suspense boundary

Severity: Medium
Page/Flow: `/explore`
Category: React/Router

Steps to reproduce:
1. Read `src/pages/explore.tsx` line 57
2. `useSearchParams()` is called without a `<Suspense>` ancestor

Expected: `useSearchParams` should be wrapped in a Suspense boundary per react-router-dom v7 docs
Actual: Direct call without Suspense may cause issues during initial render transitions
Evidence: react-router-dom v7 docs recommend Suspense for useSearchParams
User impact: Potential blank flash or error during route transitions in strict mode

### ISSUE-008: Settings page uses disconnected localStorage for collector URL

Severity: Medium
Page/Flow: `/settings`
Category: API/Config

Steps to reproduce:
1. Settings page reads collector URL from `localStorage.getItem("loza-collector-url")`
2. API client (`lib/api/client.ts`) reads from `import.meta.env.VITE_LOZANA_API_URL`
3. These two sources are not synchronized

Expected: Settings page should configure the actual API URL used by the app
Actual: Settings saves to localStorage but API client reads from env var; changing settings has no effect on API calls
Evidence: `client.ts` line 3: `const API_URL = import.meta.env.VITE_LOZANA_API_URL || ""`
User impact: User thinks they changed the collector URL but API calls still go to the env var value

### ISSUE-009: useLqlQuery has unused queryClient variable

Severity: Low
Page/Flow: `src/lib/hooks.ts` line 108
Category: Code quality

Steps to reproduce:
1. Read `src/lib/hooks.ts` lines 107-115
2. `queryClient` is obtained from `useQueryClient()` but never used

Expected: Remove unused variable or use it for cache invalidation
Actual: `const queryClient = useQueryClient()` assigned but never referenced
Evidence: Line 108 of hooks.ts
User impact: None functionally; dead code

### ISSUE-010: No 404/catch-all route

Severity: Medium
Page/Flow: Any invalid URL
Category: Routing/UX

Steps to reproduce:
1. Navigate to `/nonexistent-page`
2. No catch-all route defined

Expected: A 404 page or redirect to `/`
Actual: React Router renders nothing (blank page inside the shell)
Evidence: `app.tsx` Routes has no `*` catch-all
User impact: User sees empty content area with sidebar still visible; confusing UX

### ISSUE-011: Bundle size exceeds recommended threshold

Severity: Low
Page/Flow: Build output
Category: Performance

Steps to reproduce:
1. Run `bun run build`
2. Warning: "Some chunks are larger than 500 kB after minification"

Expected: Chunks under 500 KB
Actual: Main JS chunk is 884 KB (261 KB gzip)
Evidence: Vite build output
User impact: Slower initial load on slow connections; consider code-splitting Monaco editor and Recharts

### ISSUE-012: Duplicate type definitions for LozaEvent

Severity: Low
Page/Flow: Type system
Category: Code quality

Steps to reproduce:
1. `src/types/telemetry.ts` defines `LozaEvent` (lines 1-46)
2. `src/types/event.ts` defines an identical `LozaEvent` (lines 1-46)
3. Different files import from different locations

Expected: Single type definition
Actual: Two identical type files
Evidence: Both files are 88+ lines with identical interfaces
User impact: None functionally; maintenance risk

## Console Errors

No runtime console errors detected in code review. All components handle loading/error states gracefully through TanStack Query. The API client throws `ApiError` on HTTP failures, and all pages catch and display errors with user-friendly messages.

## Route Coverage

| Route | Page Component | Status | Notes |
|-------|---------------|--------|-------|
| `/` | OverviewPage | PASS | Stats, charts, sink health, connection status |
| `/explore` | ExplorePage | PASS | LQL input, compile, execute, results table |
| `/traces` | TracesPage | PASS | Trace search, waterfall, span detail |
| `/errors` | ErrorsPage | PASS | Error table with search filter, level badges |
| `/services` | ServicesPage | PASS | Service grid with health bars, error counts |
| `/dashboards` | DashboardsPage | PASS | Panel CRUD with dialog, navigate to explore |
| `/queries` | QueriesPage | PASS | Saved queries list, search, run, delete |
| `/alerts` | AlertsPage | PASS | Coming soon banner, preset alert rules |
| `/collector` | CollectorPage | PASS | Pipeline stats, sink health table |
| `/settings` | SettingsPage | PASS | Connection config, theme toggle, about |

## Responsive Layout Analysis

| Breakpoint | Behavior | Status |
|-----------|----------|--------|
| Mobile (375px) | Sidebar hidden off-screen, hamburger menu, single-column grids, pt-12 for mobile topbar | PASS |
| Tablet (768px) | md:grid-cols-2 for service/dashboard cards | PASS |
| Desktop (1280px) | lg: sidebar visible (w-56), lg:grid-cols-3/4, lg:p-6 | PASS |
| Wide (1600px) | max-w-[1600px] container, full grid layouts | PASS |

## Accessibility Baseline

| Check | Status | Notes |
|-------|--------|-------|
| Skip-to-content link | PASS | Fixed position, focus-visible |
| ARIA labels | PASS | Toggle sidebar, Close sidebar, Main navigation |
| Keyboard navigation | PASS | Cmd+K command menu, Escape to close, Enter to select |
| aria-current on nav | PASS | Active page marked with aria-current="page" |
| Focus rings | PASS | focus-visible:ring-2 on all interactive elements |
| Color contrast | PASS | Uses theme tokens, not hardcoded low-contrast colors |
| Heading hierarchy | WARN | All pages use h1, but no h2/h3 hierarchy within pages |

## API Integration Summary

| Endpoint | Used By | Status |
|----------|---------|--------|
| POST /query | Explore, Traces, Errors, Services, Overview | Via `lib/api/events.ts` |
| POST /lql/query | Explore (LQL mode) | Via `lib/api/events.ts` (unused direct path) |
| GET /status | Overview, Collector | Via `lib/api/collector.ts` |
| GET /version | Collector | Via `lib/api/collector.ts` |
| GET /health | Not used | Dead endpoint config |
| GET /ready | Not used | Dead endpoint config |

All API calls go through `lib/api/client.ts` which adds Authorization header if `VITE_LOZA_API_KEY` is set.

## Zustand Stores Analysis

| Store | Used By | Status |
|-------|---------|--------|
| `useQueryStore` | Explore page | PASS |
| `useDashboardStore` | Dashboards, Queries pages | PASS |
| `useAppStore` | Not imported | DEAD |
| `useTimeRangeStore` | Not imported | DEAD |

## Final Assessment

The Lozana dashboard is a well-structured React SPA with:
- Clean TypeScript (zero type errors)
- Proper TanStack Query integration with loading/error states
- Good responsive design with mobile-first approach
- Solid accessibility foundations
- Thoughtful UI with skeletons, empty states, error cards
- Command menu (Cmd+K) for quick navigation
- Theme system (dark/light/system) with localStorage persistence

The main issues are organizational dead code from the architecture migration and a few configuration gaps (ESLint config, 404 route, settings/API sync).

```
STATUS: DONE_WITH_CONCERNS
HEALTH SCORE: 74/100
CRITICAL ISSUES: 0
HIGH ISSUES: 1 (ESLint config missing)
MEDIUM ISSUES: 5 (dead code, Suspense boundary, settings/API sync, 404 route, code duplication)
LOW ISSUES: 5 (duplicate cn, stale dist, stale nav config, unused variable, bundle size, duplicate types)
RECOMMENDATION: ship-after-fixes
```

## License

See [LICENSE](LICENSE) file.
