# Frontend Review: Loxana v0.2.0 Dashboard

## Summary

Full code review of the Loxana Vite+React 19 observability dashboard. Reviewed all source files in `src/` covering pages, components, stores, hooks, API layer, feature modules, types, config, and styles. This is a comprehensive static review of the entire frontend codebase (~100 source files).

## DESIGN.md Source
- Source: not found
- Reviewed against: existing repo UI patterns, shadcn/ui conventions, globals.css design tokens

## Architecture Overview

| Layer | Tech | Status |
|---|---|---|
| Framework | Vite 6 + React 19 | OK |
| Routing | react-router-dom v7 (eager, no lazy loading) | WARN |
| State | Zustand 5 stores (4 stores) | OK |
| Server State | TanStack Query v5 | OK |
| Styling | Tailwind CSS v4 + CSS variables (dark/light) | OK |
| UI Kit | shadcn/ui via @base-ui/react (15 components) | OK |
| Charts | Recharts v3 | OK |
| Editor | Monaco Editor (eager) | WARN |
| Tables | TanStack Table v8 | OK |
| Bundler | Vite 6 with path alias | OK |

## Findings

### CRITICAL

#### C1. SQL Injection via LQL Compiler (wasm.ts)
**File:** `src/lib/lql/wasm.ts`, lines 97-149
**Impact:** An attacker typing `from events | where service = "'; DROP TABLE events; --"` into the Explore page's LQL input can inject arbitrary SQL. The `compileWhereExpr` function in `wasm.ts` does NOT call `sqlEscape` on string literal values in `=`, `has`, `contains`, `startswith`, `endswith` patterns. The regex captures are interpolated directly into SQL:
```
return `json_extract_string(raw, '$.${field}') = '${value}'`
```
The `sqlEscape` function exists in this file but is never called within `compileWhereExpr`. Compare with the newer `src/features/query/lql/lqlParser.ts` which correctly calls `sqlEscape` on captured values.

**Note:** The Explore page (`src/pages/explore.tsx`, line 5) imports from `@/lib/lql/wasm` (the vulnerable version), not from `src/features/query/lql/lqlParser` (the fixed version). The duplicate LQL compiler is a code smell, but the import path makes this a real attack vector.

### HIGH

#### H1. Missing 404 / Catch-All Route
**File:** `src/app/app.tsx` (lines 22-33)
**Impact:** The `Routes` block has 10 `<Route>` entries but no catch-all `<Route path="*" ...>`. Navigating to any undefined path (e.g., `/nonexistent`, `/foo`) renders a blank page inside the app shell with no feedback. Additionally, the `navItems` array in `src/config/nav.ts` includes `/logs`, `/metrics`, and `/service-map`, but these routes do not exist in `app.tsx`. Clicking those sidebar links shows a blank page.

#### H2. Duplicate LQL Compiler -- Import Ambiguity
**Files:** `src/lib/lql/wasm.ts` vs `src/features/query/lql/lqlParser.ts`
**Impact:** Two nearly identical `compileToDuckDB` implementations exist. The older one (`wasm.ts`) has the SQL injection (C1). The newer one (`lqlParser.ts`) has proper escaping and more operators (`!=`, `>=`, `<=`, `in`, `extend`, `first`, `last`). The Explore page imports from the old one. This is a maintenance trap -- a developer fixing the parser might fix one copy and leave the other vulnerable.

#### H3. Duplicate QueryClient Instantiation
**Files:** `src/app/providers.tsx` (line 4) and `src/lib/query-client.ts` (line 3)
**Impact:** Two separate `QueryClient` instances are created with identical config. The `Providers` component uses its own local instance. The exported `queryClient` from `query-client.ts` is never imported anywhere. This is not broken (only one is used) but confusing and a maintenance risk -- changes to one config won't affect the other.

#### H4. No Error Boundary
**File:** `src/app/app.tsx`
**Impact:** If any page component throws during render (e.g., unexpected data shape from API), the entire React tree unmounts with a white screen. There is no `<ErrorBoundary>` wrapper anywhere in the component tree.

### MEDIUM

#### M1. `"use client"` Directives in Vite Project
**Files:** `src/lib/hooks.ts` (line 1), all 10 `src/pages/*.tsx` files
**Impact:** These are Next.js directives that have no effect in a Vite+React SPA. They are harmless but indicate copy-paste from a Next.js template and add noise.

#### M2. Duplicate `cn` Utility
**Files:** `src/lib/cn.ts` and `src/lib/utils.ts`
**Impact:** Both export identical `cn()` functions. Some components import from `@/lib/cn`, others from `@/lib/utils`. Not broken but inconsistent.

#### M3. Duplicate Type Definitions
**Files:** `src/types/event.ts` and `src/types/telemetry.ts`
**Impact:** Both files define identical `LoxaEvent`, `ProcessStep`, `Checkpoint`, `QueryResult`, `CollectorHealth`, `SinkHealth`, `TimeRange` interfaces. The `hooks.ts` file imports from `@/types/event`, while feature API modules import from `@/types/telemetry`. Changes to one copy won't propagate to the other.

#### M4. WebSocket Hook Lacks Reconnection
**File:** `src/hooks/useWebSocket.ts`
**Impact:** The hook connects once. If the connection drops, `connected` is set to `false` but no reconnection attempt is made. For a live-tail feature (`enableLiveTail` flag is on), this means the connection silently dies and the user must manually refresh.

#### M5. Monaco Editor Hardcoded to Dark Theme
**File:** `src/features/query/components/QueryEditor.tsx` (line 136)
**Impact:** `monaco.editor.setTheme("loxa-dark")` is called on mount and never updates. If the user switches to light theme in Settings, the editor remains dark.

#### M6. Settings Page Does Not Persist to API Client
**File:** `src/pages/settings.tsx`
**Impact:** The Settings page saves `collectorUrl` to `localStorage` under key `loxa-collector-url`, but the API client (`src/lib/api/client.ts`) reads `VITE_LOXANA_API_URL` from the environment variable and never checks localStorage. Changing the URL in Settings has no effect on actual API calls. The two systems are disconnected.

#### M7. Stale Route/Nav Config Files
**Files:** `src/config/routes.ts` and `src/config/nav.ts`
**Impact:** These files define paths (`/logs`, `/metrics`, `/service-map`) that do not match the actual routes in `app.tsx` (`/errors`, `/services`, `/dashboards`, `/queries`, `/collector`). They appear to be stale artifacts. The sidebar (`sidebar.tsx`) uses its own hardcoded `navItems` array that correctly matches the actual routes. If any code imports from these config files for navigation, it will point to non-existent routes.

### LOW

#### L1. `ChartTooltip` Uses `any` Types
**File:** `src/pages/overview.tsx` (lines 123, 128)
**Impact:** `function ChartTooltip({ active, payload, label }: any)` -- the Recharts tooltip props should be typed with Recharts' `TooltipProps` or a local interface.

#### L2. Index Keys Used in Mapped Lists
**Files:** Multiple pages use array index as React key for data rows:
- `explore.tsx` line 265: `key={i}` for table rows
- `errors.tsx` line 241: `key={i}` for table rows
- `services.tsx` line 105: `key={i}` for service cards
- `overview.tsx` line 70: `key={i}` for skeleton bars

Since these lists don't reorder, index keys are acceptable here. Noted for awareness.

#### L3. Unused `useLqlQuery` Mutation Hook
**File:** `src/lib/hooks.ts` (lines 107-115)
**Impact:** The hook is defined but never imported or used anywhere. Dead code.

#### L4. Sidebar Always Shows "System Online"
**File:** `src/components/layout/sidebar.tsx` (lines 147-153)
**Impact:** The green "System Online" indicator is always shown regardless of actual collector connectivity status. Could mislead users into thinking the system is connected when it is not.

#### L5. Missing `asChild` on DialogTrigger
**Files:** `src/pages/dashboards.tsx` (line 62), `src/pages/queries.tsx` (line 71)
**Impact:** `<DialogTrigger className="inline-flex items-center...">` renders as a `<button>` inside a `<button>` (DialogTrigger is already a button). This creates invalid nested HTML and breaks some screen readers. Should use `<DialogTrigger asChild>` with an explicit `<Button>` child.

#### L6. Missing `vitest` in devDependencies
**File:** `package.json`
**Impact:** The `"test": "vitest"` script exists but `vitest` is not listed as a devDependency. Running the test script would fail unless vitest is installed globally.

#### L7. Hardcoded Brand Colors
**Files:** Multiple pages define `BRAND = { teal: "#32E0C4", ... }` locally (overview.tsx, traces.tsx, services.tsx, alerts.tsx, errors.tsx)
**Impact:** Brand colors are hardcoded in 5+ files rather than using CSS variables. Acceptable since Recharts doesn't support CSS variables in fill props, but creates a maintenance surface.

## DESIGN.md Compliance
Pass/Fail: N/A (DESIGN.md not found). Reviewed against existing CSS design tokens in `globals.css`. The theme system is well-structured with dark/light mode CSS variables. All components use the token system correctly via Tailwind utility classes. Hardcoded brand colors in Recharts fill props are acceptable.

## UX
Pass/Fail: FAIL (missing 404 route, disconnected Settings URL)

- Every page has a clear header with title and description
- Loading states: Skeleton components on all data-fetching pages (overview, errors, services, collector, traces, explore)
- Empty states: Descriptive empty states with icons on all pages (explore, errors, services, dashboards, queries, traces, alerts)
- Error states: Error cards with messages on overview, errors, services, collector, traces, explore
- Destructive actions: Delete buttons on dashboards/queries are visually distinct (ghost + hover:text-destructive)
- Command menu (Cmd+K): Well-implemented with keyboard navigation, categories, and empty state
- Copy-to-clipboard: Available on SQL output, trace IDs, span details
- **Fail:** No 404 page for unknown routes; Settings URL change has no effect

## Layout
Pass/Fail: PASS
- Desktop (lg+): Fixed sidebar (w-56) + scrollable main content with max-w-[1600px]
- Tablet (md): Sidebar hidden off-screen, hamburger menu, 2-column grids
- Mobile (< md): Full-width layout, 1-column grids, mobile topbar with hamburger
- Responsive grids: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3/4` used consistently
- Overflow: Tables use `overflow-auto` with max-height constraints. Long text uses `truncate` or `break-all`.
- Skip-to-content link: Present for keyboard users
- Body scroll lock: Applied when mobile sidebar is open

## Accessibility
Pass/Fail: PASS (with caveats)
- Skip-to-content link present (`<a href="#main-content">`)
- ARIA labels on interactive elements (sidebar toggle, close button, nav)
- Keyboard navigation in Command Menu (arrow keys, Enter, Escape)
- `aria-current="page"` on active nav links
- Focus-visible rings on interactive elements
- Dialog from @base-ui/react with proper title, description, close button with sr-only label
- Caveats: nested button in DialogTrigger (L5), Monaco editor lacks ARIA label

## TypeScript
Pass/Fail: PASS
- Strict mode enabled (`"strict": true` in tsconfig.json)
- Props are typed on all components
- Only 2 `any` instances (ChartTooltip in overview.tsx)
- No `@ts-ignore`/`@ts-expect-error`/`@ts-nocheck`
- No `console.log/warn/error`
- No `eslint-disable`
- Null safety: Optional chaining and nullish coalescing used consistently

## React / Next.js Patterns
Pass/Fail: WARN (see findings: no error boundary, `"use client"` misuse, duplicate QueryClient)
- StrictMode enabled in main.tsx
- Stable keys on most lists (event_id, panel.id, sink.name); index keys only on non-reorderable lists
- No state updates during render
- useCallback used appropriately in event handlers
- useMemo used in SpanTree, QueryResultTable, JsonViewer, HeatmapChart
- react-router-dom v7 with BrowserRouter -- correct for SPA

## Performance
Pass/Fail: PASS
- Monaco Editor is heavy (~2MB) but loaded via `@monaco-editor/react` which has built-in lazy loading
- Recharts components are tree-shakeable
- TanStack Query provides proper caching with staleTime (5s-300s) and refetchInterval (10s-30s)
- `refetchOnWindowFocus: false` -- appropriate for a dashboard
- `useDebounce` hook available for search inputs
- Charts use ResponsiveContainer with explicit heights (no CLS)
- Skeleton loaders match final layout dimensions

## Security
Pass/Fail: FAIL (SQL injection in wasm.ts LQL compiler)
- **SQL injection:** Input values NOT escaped in `src/lib/lql/wasm.ts` `compileWhereExpr`. Fixed in `src/features/query/lql/lqlParser.ts` but Explore page imports the vulnerable version.
- **XSS:** No `dangerouslySetInnerHTML` found. All user data rendered via React's text escaping. PASS.
- **API key:** Passed via `Authorization: Bearer` header. Stored in env vars (runtime) and localStorage (settings page). Acceptable for client-side SPA.

## Tests
Seen: 0 test files in `src/`
Missing: All component tests, hook tests, API integration tests, LQL compiler tests, store tests

## Review Summary

| Severity | Count | Status |
|---|---:|---|
| CRITICAL | 1 | BLOCK |
| HIGH | 4 | FAIL |
| MEDIUM | 7 | WARN |
| LOW | 7 | INFO |

Verdict: **BLOCK**

### Required Fixes Before Approval
1. **CRITICAL:** Fix SQL injection in `src/lib/lql/wasm.ts` `compileWhereExpr` -- call `sqlEscape` on all captured string values, OR delete `wasm.ts` and have the Explore page import from `src/features/query/lql/lqlParser.ts`
2. **HIGH:** Add catch-all `<Route path="*" element={<NotFoundPage />} />` with a proper 404 UI
3. **HIGH:** Resolve the duplicate LQL compiler -- delete one, keep one canonical source
4. **HIGH:** Add an `<ErrorBoundary>` wrapper around the route tree

### Recommended Fixes (Before or Shortly After Merge)
5. Consolidate duplicate QueryClient instances (use the exported one from `lib/query-client.ts`)
6. Wire the Settings page collector URL to the actual API client (read from localStorage in client.ts)
7. Add `asChild` to `DialogTrigger` in dashboards and queries pages
8. Add WebSocket reconnection logic or use a library like `reconnecting-websocket`
9. Consolidate duplicate type definitions (`event.ts` vs `telemetry.ts`) and `cn` utilities
10. Add `vitest` to devDependencies and write at least LQL compiler tests
11. Remove `"use client"` directives from all files
12. Add Monaco light theme variant or disable theme toggle when Monaco is visible
13. Update or remove stale `config/routes.ts` and `config/nav.ts`
14. Make sidebar "System Online" indicator reflect actual collector connectivity
