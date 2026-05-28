# Frontend Review: Loxana v0.2.3 Dashboard

Date: 2026-05-27
Version: v0.2.3

## Summary

Full code review of the Loxana Vite+React 19 observability dashboard. Reviewed all source files in `src/` covering pages, components, stores, hooks, API layer, feature modules, types, config, and styles. This is a comprehensive static review of the entire frontend codebase (~100 source files).

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
**Impact:** The `Routes` block has 10 `<Route>` entries but no catch-all `<Route path="*" ...>`. Navigating to any undefined path renders a blank page inside the app shell with no feedback.

#### H2. Duplicate LQL Compiler -- Import Ambiguity
**Files:** `src/lib/lql/wasm.ts` vs `src/features/query/lql/lqlParser.ts`
**Impact:** Two nearly identical `compileToDuckDB` implementations exist. The older one (`wasm.ts`) has the SQL injection (C1). The newer one (`lqlParser.ts`) has proper escaping and more operators. The Explore page imports from the old one. This is a maintenance trap.

#### H3. Duplicate QueryClient Instantiation
**Files:** `src/app/providers.tsx` (line 4) and `src/lib/query-client.ts` (line 3)
**Impact:** Two separate `QueryClient` instances are created with identical config. The `Providers` component uses its own local instance. The exported `queryClient` from `query-client.ts` is never imported anywhere.

#### H4. No Error Boundary
**File:** `src/app/app.tsx`
**Impact:** If any page component throws during render, the entire React tree unmounts with a white screen. There is no `<ErrorBoundary>` wrapper anywhere in the component tree.

### MEDIUM

#### M1. `"use client"` Directives in Vite Project
**Files:** `src/lib/hooks.ts` (line 1), all 10 `src/pages/*.tsx` files
**Impact:** These are Next.js directives that have no effect in a Vite+React SPA. Harmless but indicate copy-paste from a Next.js template.

#### M2. Duplicate `cn` Utility
**Files:** `src/lib/cn.ts` and `src/lib/utils.ts`
**Impact:** Both export identical `cn()` functions. Some components import from `@/lib/cn`, others from `@/lib/utils`.

#### M3. Duplicate Type Definitions
**Files:** `src/types/event.ts` and `src/types/telemetry.ts`
**Impact:** Both files define identical `LoxaEvent`, `ProcessStep`, `Checkpoint`, `QueryResult`, `CollectorHealth`, `SinkHealth`, `TimeRange` interfaces.

#### M4. WebSocket Hook Lacks Reconnection
**File:** `src/hooks/useWebSocket.ts`
**Impact:** The hook connects once. If the connection drops, `connected` is set to `false` but no reconnection attempt is made.

#### M5. Monaco Editor Hardcoded to Dark Theme
**File:** `src/features/query/components/QueryEditor.tsx` (line 136)
**Impact:** `monaco.editor.setTheme("loxa-dark")` is called on mount and never updates. If the user switches to light theme, the editor remains dark.

#### M6. Settings Page Does Not Persist to API Client
**File:** `src/pages/settings.tsx`
**Impact:** The Settings page saves `collectorUrl` to `localStorage` but the API client reads `VITE_LOXANA_API_URL` from the environment variable and never checks localStorage.

#### M7. Stale Route/Nav Config Files
**Files:** `src/config/routes.ts` and `src/config/nav.ts`
**Impact:** These files define paths that do not match the actual routes in `app.tsx`. They appear to be stale artifacts.

### LOW

#### L1. `ChartTooltip` Uses `any` Types
#### L2. Index Keys Used in Mapped Lists
#### L3. Unused `useLqlQuery` Mutation Hook
#### L4. Sidebar Always Shows "System Online"
#### L5. Missing `asChild` on DialogTrigger
#### L6. Missing `vitest` in devDependencies
#### L7. Hardcoded Brand Colors

## Design Compliance

The theme system is well-structured with dark/light mode CSS variables. All components use the token system correctly via Tailwind utility classes. Hardcoded brand colors in Recharts fill props are acceptable.

## UX
Pass/Fail: FAIL (missing 404 route, disconnected Settings URL)

- Every page has a clear header with title and description
- Loading states: Skeleton components on all data-fetching pages
- Empty states: Descriptive empty states with icons on all pages
- Error states: Error cards with messages on overview, errors, services, collector, traces, explore
- Command menu (Cmd+K): Well-implemented with keyboard navigation
- Copy-to-clipboard: Available on SQL output, trace IDs, span details

## Layout
Pass/Fail: PASS
- Desktop (lg+): Fixed sidebar (w-56) + scrollable main content with max-w-[1600px]
- Tablet (md): Sidebar hidden off-screen, hamburger menu, 2-column grids
- Mobile (< md): Full-width layout, 1-column grids, mobile topbar with hamburger

## Accessibility
Pass/Fail: PASS (with caveats)
- Skip-to-content link present
- ARIA labels on interactive elements
- Keyboard navigation in Command Menu
- `aria-current="page"` on active nav links
- Focus-visible rings on interactive elements

## TypeScript
Pass/Fail: PASS
- Strict mode enabled
- Props are typed on all components
- Only 2 `any` instances (ChartTooltip in overview.tsx)
- No `@ts-ignore`/`@ts-expect-error`/`@ts-nocheck`
- No `console.log/warn/error`

## Performance
Pass/Fail: PASS
- Monaco Editor loaded via `@monaco-editor/react` with built-in lazy loading
- Recharts components are tree-shakeable
- TanStack Query provides proper caching with staleTime and refetchInterval
- Skeleton loaders match final layout dimensions

## Security
Pass/Fail: FAIL (SQL injection in wasm.ts LQL compiler)
- **SQL injection:** Input values NOT escaped in `src/lib/lql/wasm.ts` `compileWhereExpr`
- **XSS:** No `dangerouslySetInnerHTML` found. PASS.
- **API key:** Passed via `Authorization: Bearer` header. Acceptable for client-side SPA.

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
1. **CRITICAL:** Fix SQL injection in `src/lib/lql/wasm.ts` `compileWhereExpr`
2. **HIGH:** Add catch-all `<Route path="*" element={<NotFoundPage />} />`
3. **HIGH:** Resolve the duplicate LQL compiler
4. **HIGH:** Add an `<ErrorBoundary>` wrapper around the route tree

## License

See [LICENSE](LICENSE) file.
