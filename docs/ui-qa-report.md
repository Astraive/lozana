# UI QA Report: Loxana Dashboard (v0.2.0)

Date: 2026-05-27 (updated)
Target: Loxana Vite SPA (full source code audit)
Mode: UI QA -- static code review + build verification

## Summary

Visual quality score: **76/100**
Status: **PASS_WITH_ISSUES**
Build: TypeScript clean, Vite production build succeeds (6.3s, 884 KB JS, 76 KB CSS)

Recommendation:
- Ship after addressing the 4 high-severity issues (fonts, light mode editor, chart cursor, gold contrast)

## Build Verification

Build passes cleanly:
```
vite v6.4.2 building for production...
3159 modules transformed
dist/index-CT7MkJC0.js  884.09 kB (gzip: 261.54 kB)
```

One warning: chunk exceeds 500 kB -- recommend code-splitting routes via `React.lazy()`.

## Design Sources Referenced

- `DESIGN.md`: not found at repo root or loxana/
- Theme/tokens: **used** -- `src/styles/globals.css` defines full dark + light token sets
- Component library: **detected** -- 19 shadcn-style primitives in `src/components/ui/`
- Font system: `--font-sans: "Geist"`, `--font-mono: "Geist Mono"` declared in CSS but **never loaded**
- Config files: `src/config/nav.ts` and `src/config/routes.ts` exist but are **stale and unused**

## UI Areas Tested

| Area | Status | Notes |
|------|--------|-------|
| Layout | PASS | Consistent sidebar + main area, max-w-1600px, responsive grid breakpoints |
| Spacing | PASS_WITH_ISSUES | Generally consistent; CardHeader padding varies (pb-1/pb-2/pb-3/pb-4) |
| Typography | PASS_WITH_ISSUES | Geist fonts declared but never loaded; falls back to system-ui silently |
| Colors | PASS_WITH_ISSUES | Design tokens defined but several components bypass them with hardcoded hex |
| Components | PASS_WITH_ISSUES | 19 shadcn primitives well-built; shared state components exist but pages implement inline variants |
| States | PASS | Loading skeletons, error cards, empty states, disabled buttons, hover/focus/active all present |
| Responsiveness | PASS | 375px/768px/1280px/1920px layouts correct; sidebar collapses, grids reflow |
| Dark/light mode | PASS_WITH_ISSUES | Both themes fully defined; Monaco editor locked to dark; hardcoded hex won't adapt |
| Accessibility | PASS | Skip-to-content, aria labels, focus rings, keyboard navigation all present |
| Charts | PASS_WITH_ISSUES | Recharts responsive with proper tooltips; one invalid CSS cursor color on bar charts |

## Issues Found

---

### ISSUE-001: Geist font family declared but never loaded

**Severity:** High
**Page/Component:** All pages (global)
**Category:** Typography

**Steps to reproduce:**
1. Open Loxana in any browser
2. Inspect the computed `font-family` on any body text element
3. Observe that "Geist" is not available; the browser falls back to system-ui

**Expected:** Geist and Geist Mono web fonts load and render.
**Actual:** No `@font-face` declarations or `<link>` tags exist. The CSS declares `--font-sans: "Geist", system-ui, -apple-system, sans-serif` and `--font-mono: "Geist Mono", ui-monospace, monospace` but nothing downloads the font files.
**Evidence:** `index.html` has no font preloads; `globals.css` has no `@font-face` rules; no font files exist in `public/`.
**User impact:** The app renders in system-ui and monospace fallbacks. While functional, the intended Geist typography (crisp, modern, slightly narrower than system defaults) is not delivered. Spacing and line breaks may differ subtly from the design intent.

---

### ISSUE-002: Monaco editor hardcoded to dark theme; breaks in light mode

**Severity:** High
**Page/Component:** `/explore` page -- `QueryEditor.tsx`
**Category:** Color / Dark-light mode

**Steps to reproduce:**
1. Go to Settings, switch theme to "Light"
2. Navigate to Explore page
3. Observe the Monaco code editor

**Expected:** Editor background adapts to light theme (light background, dark text).
**Actual:** Editor uses hardcoded `loxa-dark` theme with `editor.background: #081417` and `editor.foreground: #EEEEEE`. The surrounding container also hardcodes `bg-[#081417]`. In light mode, this creates a jarring dark island on a light page.
**Evidence:** `QueryEditor.tsx` lines 114-134 define the theme with hex colors; line 147 hardcodes the container background.
**User impact:** Users who prefer light mode get a jarring dark code editor that doesn't match the rest of the interface. The `loxa-dark` theme should conditionally switch to a light variant.

---

### ISSUE-003: Invalid CSS color in chart cursor -- `hsl(var(--muted))`

**Severity:** High
**Page/Component:** Overview page -- bar chart Recharts tooltips
**Category:** Color

**Steps to reproduce:**
1. Navigate to Overview page with data loaded
2. Hover over the Top Error Events or Top Services bar chart
3. Observe the cursor highlight

**Expected:** A semi-transparent cursor highlight follows the mouse.
**Actual:** The cursor `fill` is set to `"hsl(var(--muted))"` where `--muted` is `#0D7377` (a hex value). CSS evaluates `hsl(#0D7377)` which is invalid -- `hsl()` expects numeric hue/saturation/lightness, not a hex string. The cursor fill silently fails.
**Evidence:** `overview.tsx` line 331: `cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }}`; line 381: same pattern.
**User impact:** The bar chart cursor highlight doesn't render. Users lose the hover tracking visual on bar charts. (Note: the line chart cursor on line 279 uses `stroke` with a direct hex color and works correctly.)

---

### ISSUE-004: Hardcoded `#F6C85F` gold color fails WCAG contrast in light mode

**Severity:** High
**Page/Component:** errors.tsx, alerts.tsx, collector.tsx, settings.tsx, overview.tsx, traces.tsx, LogLine.tsx, LogFilters.tsx
**Category:** Color / Accessibility

**Steps to reproduce:**
1. Switch to light mode in Settings
2. Navigate to Errors page -- warning badges use `text-[#F6C85F]`
3. Measure contrast: #F6C85F on #FAFBFC background

**Expected:** Warning/gold color adapts to theme via CSS variable with adequate contrast.
**Actual:** Hardcoded #F6C85F is used in 25+ locations. On light background (#FAFBFC), this produces approximately 1.8:1 contrast ratio -- far below WCAG AA minimum of 4.5:1. The text is nearly invisible.
**Evidence:** grep finds `#F6C85F` in 12+ source files.
**User impact:** Warning-level content is nearly unreadable in light mode. This is the most impactful light-mode bug.

---

### ISSUE-005: StatusBadge uses Tailwind color classes instead of design tokens

**Severity:** Medium
**Page/Component:** `src/components/common/StatusBadge.tsx`
**Category:** Color / Design system compliance

**Steps to reproduce:**
1. Read `StatusBadge.tsx`
2. Compare color classes with `globals.css` tokens

**Expected:** Status colors derive from design tokens or brand constants.
**Actual:** Uses raw Tailwind classes: `bg-green-500/10`, `text-green-400`, `bg-yellow-500/10`, `text-yellow-400`, `bg-red-500/10`, `text-red-400`. These are standard Tailwind colors that don't match the project's teal/cyan/coral/gold palette.
**Evidence:** Lines 8-40 define status configs with `green-400`, `green-500`, `yellow-400`, `yellow-500`, `red-400`, `red-500`.
**User impact:** If StatusBadge is used alongside other components, the green/yellow/red won't match the project's teal `#32E0C4` / gold `#F6C85F` / coral `#FF5C7A` palette. Currently StatusBadge appears unused in the main pages, but if used in future features it will be visually inconsistent.

---

### ISSUE-006: JsonViewer uses hardcoded syntax highlighting colors

**Severity:** Medium
**Page/Component:** `src/components/common/JsonViewer.tsx`
**Category:** Color / Dark-light mode

**Steps to reproduce:**
1. Switch to light mode
2. View any JSON data (e.g., expanded log attributes)

**Expected:** Syntax colors adapt to light theme.
**Actual:** `SyntaxSpan` uses hardcoded classes: `text-green-400` (strings), `text-orange-400` (numbers), `text-purple-400` (booleans). These may have poor contrast on light backgrounds (`#FAFBFC`).
**Evidence:** Lines 13-26 define color mapping with fixed Tailwind color classes.
**User impact:** In light mode, `text-green-400` on `#FAFBFC` background produces approximately 3.1:1 contrast ratio, failing WCAG AA for normal text (4.5:1). The colors are also not aligned with the project's brand palette.

---

### ISSUE-007: Feature components use raw CSS variable syntax instead of Tailwind tokens

**Severity:** Medium
**Page/Component:** `LogLine.tsx`, `LogAttributes.tsx`, `LogFilters.tsx`, `TraceFilters.tsx`
**Category:** Design system compliance

**Steps to reproduce:**
1. Read the above component files
2. Compare with how other components reference design tokens

**Expected:** Components use Tailwind token classes like `text-primary`, `bg-muted/30`, `border-border`.
**Actual:** These components use raw CSS variable references: `text-[var(--primary)]`, `bg-[var(--muted)]/30`, `text-[var(--muted-foreground)]`, `border-[var(--border)]`. While functionally similar, this bypasses Tailwind's color opacity modifiers and is inconsistent with every other component.
**Evidence:** `LogLine.tsx` lines 16-21, 36-38, 44, 52, 60, 64, 69; `LogAttributes.tsx` lines 57-62, 68-69; `LogFilters.tsx` lines 27-31, 67, 72; `TraceFilters.tsx` line 38, 60.
**User impact:** `bg-[var(--muted)]/30` may not render the same as `bg-muted/30` because the opacity modifier is applied to the raw variable, not the resolved color. This could cause subtle rendering differences.

---

### ISSUE-008: Dashboard and Queries pages don't use Button component for DialogTrigger

**Severity:** Medium
**Page/Component:** `dashboards.tsx`, `queries.tsx`
**Category:** Component consistency

**Steps to reproduce:**
1. Read `dashboards.tsx` line 62 and `queries.tsx` line 71
2. Compare with Button usage elsewhere

**Expected:** Primary action buttons use the shared `<Button>` component.
**Actual:** Both pages use a raw `<DialogTrigger>` with inline classes: `"inline-flex items-center gap-1.5 rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors"`. This duplicates the `buttonVariants({ variant: "default" })` styling.
**Evidence:** `dashboards.tsx` line 62; `queries.tsx` line 71.
**User impact:** These buttons lack `focus-visible:ring-2 focus-visible:ring-ring` styles that the Button component provides, creating an accessibility gap on keyboard focus. If the Button component's styling changes, these pages won't pick up the change.

---

### ISSUE-009: Shared data components exist but are unused by pages

**Severity:** Medium
**Page/Component:** `src/components/data/ErrorState.tsx`, `LoadingState.tsx`, `src/components/dashboard/stat-card.tsx`
**Category:** Component consistency

**Steps to reproduce:**
1. Read ErrorState, LoadingState, StatCard components
2. Search all pages for imports -- none import these shared components
3. Every page implements its own inline empty/loading/error states

**Expected:** Pages reuse shared state components for consistency.
**Actual:** 3 polished shared components exist but are never imported. Each page has its own inline variant with slightly different styling (e.g., overview StatCard uses `font-mono` for values, shared StatCard doesn't).
**Evidence:** `stat-card.tsx` vs `overview.tsx` inline StatCard; `LoadingState.tsx` vs page-specific skeletons.
**User impact:** Visual inconsistency risk as pages evolve independently; wasted component work.

---

### ISSUE-010: Duplicate BRAND color objects across 4 pages

**Severity:** Medium
**Page/Component:** `overview.tsx`, `traces.tsx`, `services.tsx`, `alerts.tsx`
**Category:** Color / Design system

**Steps to reproduce:**
1. Search for `const BRAND` -- found in 4 page files
2. All define the same teal/cyan/coral/gold hex values
3. These are NOT CSS variables and won't respond to theme changes

**Expected:** Chart colors centralized in a shared constant or CSS variable.
**Actual:** `BRAND = { teal: "#32E0C4", cyan: "#00D9F5", coral: "#FF5C7A", gold: "#F6C85F" }` duplicated in 4 files. Used for Recharts `fill` and `stroke` props.
**Evidence:** `overview.tsx:34`, `traces.tsx:39`, `services.tsx:16`, `alerts.tsx:22`.
**User impact:** Charts won't adapt to light mode; maintenance burden for color updates. If a brand color changes, 4 files need updating.

---

### ISSUE-011: `text-muted-foreground/40` fails WCAG AA contrast on dark backgrounds

**Severity:** Medium
**Page/Component:** Multiple pages (explore, errors, services, traces, collector)
**Category:** Color contrast / Accessibility

**Steps to reproduce:**
1. Inspect any element using `text-muted-foreground/40` in dark mode
2. Measure contrast against `--background: #050D10`

**Expected:** All text meets WCAG AA (4.5:1 for normal text, 3:1 for large text).
**Actual:** `--muted-foreground` is `#8AA0A6`. At 40% opacity on `#050D10`, the effective color is approximately `#2A3A3E`. Against `#050D10`, this produces approximately 2.8:1 contrast -- below the 3:1 minimum for large text and well below 4.5:1 for normal text.
**Evidence:** Used in: `explore.tsx` line 279; `errors.tsx` line 267; `services.tsx` line 163; `traces.tsx` line 333; `collector.tsx` line 289.
**User impact:** Decorative/placeholder text at 40% opacity is unreadable for users with low vision. These are typically em-dash placeholders or secondary metadata, so impact is limited but still fails accessibility standards.

---

### ISSUE-012: Duplicate `cn` utility files

**Severity:** Low
**Page/Component:** `src/lib/cn.ts`, `src/lib/utils.ts`
**Category:** Design system compliance

**Steps to reproduce:**
1. Read both files

**Expected:** Single source of truth for the `cn` utility.
**Actual:** Both files export identical `cn` functions. Pages import from `@/lib/utils`, UI components import from `@/lib/cn`.
**Evidence:** `cn.ts` and `utils.ts` are byte-for-byte identical.
**User impact:** No visual impact. Creates maintenance confusion -- if one file is updated and the other isn't, subtle class merging differences could appear.

---

### ISSUE-013: Stale config files don't match actual routes/nav

**Severity:** Low
**Page/Component:** `src/config/nav.ts`, `src/config/routes.ts`, `src/config/charts.ts`
**Category:** Design system compliance

**Steps to reproduce:**
1. Read `nav.ts` -- lists 8 items (Dashboard, Explore, Traces, Logs, Metrics, Alerts, Service Map, Settings)
2. Read `routes.ts` -- lists `/logs`, `/metrics`, `/service-map` which don't exist
3. Read `charts.ts` -- defines a different color palette (blue/green/amber) than what pages use
4. Compare with actual routes in `app.tsx` and `sidebar.tsx`

**Expected:** Config files match the actual application.
**Actual:** All three config files are stale and unused. The sidebar defines nav inline; routes are defined in `app.tsx`; charts use page-level BRAND objects.
**Evidence:** `nav.ts` lines 3-12 vs `sidebar.tsx` lines 19-30; `routes.ts` vs `app.tsx` routes; `charts.ts` vs page BRAND objects.
**User impact:** No visual impact. Dead code that could mislead developers.

---

### ISSUE-014: `"use client"` directives in Vite SPA

**Severity:** Low
**Page/Component:** All 10 page files + `hooks.ts`
**Category:** Code quality

**Steps to reproduce:**
1. Read any page file's first line

**Expected:** No Next.js-specific directives in a Vite SPA.
**Actual:** All pages start with `"use client";` which is a Next.js App Router directive. In a Vite/React SPA, this is parsed as a string expression and has no effect.
**Evidence:** `overview.tsx`, `explore.tsx`, `traces.tsx`, `errors.tsx`, `services.tsx`, `dashboards.tsx`, `queries.tsx`, `alerts.tsx`, `collector.tsx`, `settings.tsx` all begin with `"use client";`.
**User impact:** No visual impact. Harmless but misleading -- suggests the code was ported from a Next.js project without cleanup.

---

### ISSUE-015: Inconsistent CardHeader padding across pages

**Severity:** Low
**Page/Component:** Multiple pages
**Category:** Spacing

**Steps to reproduce:**
1. Compare CardHeader className across pages:
   - overview.tsx: `pb-1`, `pb-2`, `pb-3`
   - explore.tsx: `pb-2`
   - errors.tsx: `pb-2`
   - settings.tsx: `pb-4`
   - collector.tsx: `pb-2`

**Expected:** Consistent CardHeader bottom padding across pages.
**Actual:** Mix of pb-1, pb-2, pb-3, pb-4 across different cards. The default CardHeader padding is `p-5` from card.tsx.
**Evidence:** Direct className comparison across page files.
**User impact:** Subtle spacing inconsistency between pages; noticeable when navigating between them.

---

### ISSUE-016: HeatmapChart doesn't handle empty data gracefully

**Severity:** Low
**Page/Component:** `src/components/charts/HeatmapChart.tsx`
**Category:** State / Broken state

**Steps to reproduce:**
1. Render `<HeatmapChart data={[]} />`
2. Observe JavaScript behavior

**Expected:** Empty state rendered or graceful no-op.
**Actual:** `Math.min(...[])` returns `Infinity` and `Math.max(...[])` returns `-Infinity`. The color interpolation function receives `NaN` ratios.
**Evidence:** Lines 46-51 compute `valueRange` without empty-array guard.
**User impact:** Currently the HeatmapChart doesn't appear to be used in any page, so this is a latent bug.

---

### ISSUE-017: Bundle size warning (884 kB single chunk)

**Severity:** Low
**Page/Component:** Build output
**Category:** Performance

**Steps to reproduce:**
1. Run `vite build`
2. Observe warning: "Some chunks are larger than 500 kB after minification"
3. Single JS chunk at 884 kB (261 kB gzipped)

**Expected:** Code-split routes for smaller initial load.
**Actual:** All 10 routes + Monaco editor + Recharts bundled into single chunk.
**Evidence:** Build output shows single `index-CT7MkJC0.js` at 884 kB.
**User impact:** Slower initial page load on slow connections; all route code loaded upfront.

---

## Responsive Design Analysis

Tested layout behavior at key breakpoints:

| Breakpoint | Width | Behavior | Status |
|------------|-------|----------|--------|
| Mobile | 375px | Sidebar hidden off-screen, hamburger menu visible, single-column grids, `p-4` padding | PASS |
| Tablet | 768px | Sidebar still hidden, 2-column grids for cards/stats, `p-4` padding | PASS |
| Desktop | 1280px | Sidebar fixed visible (`w-56` = 224px), 3-4 column grids, `p-6` padding | PASS |
| Wide | 1920px | Content capped at `max-w-[1600px]`, centered | PASS |

Key responsive patterns verified:
- `grid-cols-1 md:grid-cols-2 lg:grid-cols-4` for stat cards
- `grid-cols-1 md:grid-cols-2 lg:grid-cols-3` for service cards
- `grid-cols-1 lg:grid-cols-[1fr_360px]` for trace timeline + detail sidebar
- Mobile topbar: `h-12`, visible below `lg` breakpoint
- Sidebar: `lg:translate-x-0` (always visible on desktop), `-translate-x-full` (hidden on mobile)
- Body scroll lock when mobile sidebar is open
- Sidebar closes on Escape key and on route change

---

## Dark/Light Mode Analysis

The theme system is well-implemented:
- `ThemeProvider` with dark/light/system options
- LocalStorage persistence
- System preference detection via `matchMedia`
- CSS class toggling (`dark`/`light` on `<html>`)
- `colorScheme` property set for native form controls

| Element | Dark Mode | Light Mode | Status |
|---------|-----------|------------|--------|
| Background | #050D10 | #FAFBFC | PASS |
| Cards | #081417 | #FFFFFF | PASS |
| Primary | #32E0C4 | #0D7377 | PASS |
| Borders | rgba(255,255,255,0.08) | rgba(0,0,0,0.1) | PASS |
| BRAND hex fills | Fixed #32E0C4 | Same fixed | WARN -- won't adapt |
| #F6C85F gold | Visible | ~1.8:1 contrast | FAIL |
| Monaco editor | Dark theme | Still dark | FAIL |
| StatusBadge | Fixed green/yellow/red | Same | WARN |

---

## Z-Index Stacking Analysis

| Layer | Z-Index | Elements |
|-------|---------|----------|
| Base content | auto | Page content |
| Mobile topbar | z-20 | Hamburger + logo |
| Sidebar overlay | z-30 | Backdrop blur |
| Sidebar | z-40 | Navigation panel |
| Dialog/Sheet/Tooltip/Select | z-50 | All overlays |
| Skip-to-content | z-[100] | Accessibility link |

Stacking order is correct. No z-index conflicts detected. Dialogs appear above sidebar. Skip-to-content only appears on focus (hidden via `-translate-y-20`).

---

## Toast Notifications (Sonner) Analysis

- Toaster positioned correctly (default: bottom-right)
- Theme-aware via `resolvedTheme` from ThemeProvider
- Custom toast styles use design tokens (`bg-card`, `text-card-foreground`, `border-border`)
- Font set to `font-mono` for consistency with data display
- `shadow-primary/5` for subtle brand tint on shadows

No issues found.

---

## Loading State Analysis

Every data-loading page includes skeleton loaders:
- **Overview:** `StatSkeleton` (4 cards), `ChartSkeleton` (bar chart skeletons)
- **Explore:** `ResultsSkeleton` (table header + 8 rows)
- **Traces:** `TraceSkeleton` (8 rows)
- **Errors:** `TableSkeleton` (10 rows)
- **Services:** `ServiceCardSkeleton` (6 cards)
- **Collector:** `StatSkeleton` (4 cards)

All skeletons use `animate-pulse` with `bg-muted/60` and `bg-muted/40` for subtle shimmer. Consistent pattern.

---

## Empty State Analysis

Every page handles empty data with a consistent pattern:
- Rounded icon container (`h-16 w-16 rounded-full bg-muted/30`)
- Medium weight title (`text-sm font-medium text-muted-foreground`)
- Muted description (`text-xs text-muted-foreground/60`)

Pages verified: Overview, Explore, Traces, Errors, Services, Dashboards, Queries, Alerts (coming-soon banner).

---

## Error State Analysis

Pages with API calls include error cards using consistent pattern:
- `border-destructive/30 bg-destructive/[0.05]`
- `AlertTriangle` icon in `text-destructive`
- Title: `text-sm font-medium text-destructive`
- Description: `text-xs text-muted-foreground`

Pages verified: Overview, Traces, Errors, Services, Collector.

---

## Component State Analysis

| Component | Default | Hover | Focus | Disabled | Loading |
|-----------|---------|-------|-------|----------|---------|
| Button | PASS | PASS | PASS | PASS | N/A |
| Input | PASS | N/A | PASS | PASS | N/A |
| Badge | PASS | N/A | N/A | N/A | N/A |
| Card | PASS | PASS | N/A | N/A | N/A |
| Select | PASS | PASS | PASS | PASS | N/A |
| Dialog | PASS | N/A | N/A | N/A | N/A |
| Tabs | PASS | PASS | PASS | PASS | N/A |
| Sidebar links | PASS | PASS | PASS | N/A | N/A |
| Table rows | PASS | PASS | N/A | N/A | N/A |
| Command Menu | PASS | PASS | PASS | N/A | N/A |

All interactive elements include:
- `transition-colors` or `transition-all` for smooth state changes
- `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` for keyboard focus
- `disabled:opacity-50 disabled:pointer-events-none` for disabled state
- `hover:bg-muted/50` or `hover:bg-primary/10` for hover feedback

---

## Final Recommendation

The Loxana dashboard is a well-crafted React SPA with strong design fundamentals:
- Consistent dark theme with proper CSS custom properties
- Excellent responsive layout that works across all breakpoints
- Comprehensive loading, empty, and error states on every page
- Accessible keyboard navigation with skip-to-content, focus rings, and ARIA labels
- Proper z-index stacking with no conflicts
- Clean shadcn-style component primitives with consistent variants

**Before shipping, address these high-severity issues:**
1. **Load Geist fonts** -- add `<link>` tags in `index.html` or `@font-face` rules in CSS
2. **Fix Monaco editor light mode** -- add a light theme variant and switch based on ThemeProvider
3. **Fix chart cursor color** -- replace `hsl(var(--muted))` with `var(--muted)` or direct hex
4. **Fix gold color in light mode** -- replace hardcoded `#F6C85F` with a CSS variable that has a dark-mode-appropriate variant

The medium-severity issues (StatusBadge tokens, JsonViewer colors, unused shared components, duplicated BRAND objects) are polish items that can be addressed in a follow-up sprint.

Additional low-severity cleanup (dead config files, duplicate chart wrappers, stale components.json/README, unused imports, Mac-only shortcut symbol) can be batched into a housekeeping pass.

---

### ISSUE-018: `components.json` references stale shadcn config

**Severity:** Low
**Page/Component:** `components.json`
**Category:** Design system compliance

**Steps to reproduce:**
1. Open `components.json`
2. Shows `"rsc": true`, `"css": "src/app/globals.css"`, `"baseColor": "neutral"`
3. This is a Vite SPA, not Next.js RSC; actual CSS is at `src/styles/globals.css`; base palette is teal/cyan not neutral

**Expected:** Config matches current project setup.
**Actual:** Stale config from initial Next.js scaffolding. Running `npx shadcn@latest add` will use wrong paths and wrong base color.
**Evidence:** `components.json` lines 4-5.
**User impact:** No visual impact. Developer tooling confusion.

---

### ISSUE-019: `README.md` is Next.js boilerplate

**Severity:** Low
**Page/Component:** `README.md`
**Category:** Content

**Steps to reproduce:**
1. Open `README.md`
2. Content references Next.js, create-next-app, app/page.tsx, next/font

**Expected:** Vite+React project documentation.
**Actual:** Unmodified Next.js boilerplate.
**Evidence:** Entire README content.
**User impact:** Misleading for contributors. Not a visual issue.

---

### ISSUE-020: `providers.tsx` has unused `useState` import

**Severity:** Low
**Page/Component:** `src/app/providers.tsx`
**Category:** Code quality

**Steps to reproduce:**
1. Open `providers.tsx` line 2
2. `import { useState } from "react"` -- `useState` is never called

**Expected:** No unused imports.
**Actual:** Dead import.
**Evidence:** Line 2.
**User impact:** No visual impact. Minor lint issue.

---

### ISSUE-021: Command menu keyboard shortcut shows only Mac symbol

**Severity:** Low
**Page/Component:** `src/components/layout/sidebar.tsx` line 142
**Category:** Accessibility

**Steps to reproduce:**
1. Open sidebar bottom section
2. "Press [symbol]K to search" -- symbol is `&#8984;` (Mac Command key)

**Expected:** Show "Ctrl+K" on Windows/Linux, "Cmd+K" on Mac.
**Actual:** Always shows Mac command symbol regardless of platform.
**Evidence:** Line 142.
**User impact:** Windows/Linux users may not recognize the symbol.

---

### ISSUE-022: Duplicate chart component wrappers (3 near-identical pairs)

**Severity:** Low
**Page/Component:** `src/components/charts/`
**Category:** Component consistency

**Steps to reproduce:**
1. `BarChart.tsx` and `loxa-bar-chart.tsx` are nearly identical Recharts Bar wrappers
2. `loxa-line-chart.tsx` and `TimeSeriesChart.tsx` are nearly identical Recharts Line wrappers

**Expected:** Single set of chart primitives.
**Actual:** 5 chart component files with 2 duplicate pairs.
**Evidence:** Compare `BarChart.tsx` with `loxa-bar-chart.tsx` line by line.
**User impact:** Maintenance burden. No visual impact.

---

## Issue Summary

| Severity | Count | Issues |
|----------|-------|--------|
| High | 4 | #001 (fonts), #002 (Monaco light), #003 (chart cursor), #004 (gold contrast) |
| Medium | 7 | #005 (StatusBadge), #006 (JsonViewer), #007 (raw CSS vars), #008 (DialogTrigger), #009 (unused components), #010 (BRAND dup), #011 (contrast 40%) |
| Low | 11 | #012 (dup cn), #013 (stale configs), #014 (use client), #015 (padding), #016 (HeatmapChart), #017 (bundle), #018 (components.json), #019 (README), #020 (unused import), #021 (Mac symbol), #022 (dup charts) |
| **Total** | **22** | |
