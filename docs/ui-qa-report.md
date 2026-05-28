# UI QA Report: Loxana Dashboard (v0.2.3)

Date: 2026-05-27 (updated)
Version: v0.2.3
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
**User impact:** The app renders in system-ui and monospace fallbacks. While functional, the intended Geist typography is not delivered.

---

### ISSUE-002: Monaco editor hardcoded to dark theme; breaks in light mode

**Severity:** High
**Page/Component:** `/explore` page -- `QueryEditor.tsx`
**Category:** Color / Dark-light mode

**Steps to reproduce:**
1. Go to Settings, switch theme to "Light"
2. Navigate to Explore page
3. Observe the Monaco code editor

**Expected:** Editor background adapts to light theme.
**Actual:** Editor uses hardcoded `loxa-dark` theme with `editor.background: #081417` and `editor.foreground: #EEEEEE`. The surrounding container also hardcodes `bg-[#081417]`. In light mode, this creates a jarring dark island on a light page.

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
**Actual:** The cursor `fill` is set to `"hsl(var(--muted))"` where `--muted` is `#0D7377` (a hex value). CSS evaluates `hsl(#0D7377)` which is invalid. The cursor fill silently fails.
**User impact:** The bar chart cursor highlight doesn't render. Users lose the hover tracking visual on bar charts.

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
**Actual:** Hardcoded #F6C85F is used in 25+ locations. On light background (#FAFBFC), this produces approximately 1.8:1 contrast ratio -- far below WCAG AA minimum of 4.5:1.
**User impact:** Warning-level content is nearly unreadable in light mode.

---

### ISSUE-005 through ISSUE-022

See the full issue list in the original report for medium and low severity issues covering:
- StatusBadge Tailwind color classes vs design tokens
- JsonViewer hardcoded syntax highlighting colors
- Feature components using raw CSS variable syntax
- Dashboard/Queries pages missing Button component for DialogTrigger
- Shared data components unused by pages
- Duplicate BRAND color objects across 4 pages
- `text-muted-foreground/40` WCAG AA contrast failures
- Duplicate `cn` utility files
- Stale config files
- `"use client"` directives in Vite SPA
- Inconsistent CardHeader padding
- HeatmapChart empty data handling
- Bundle size warning (884 kB single chunk)
- `components.json` stale shadcn config
- `README.md` Next.js boilerplate
- `providers.tsx` unused `useState` import
- Command menu Mac-only keyboard shortcut
- Duplicate chart component wrappers

## Responsive Design Analysis

| Breakpoint | Width | Behavior | Status |
|------------|-------|----------|--------|
| Mobile | 375px | Sidebar hidden off-screen, hamburger menu visible, single-column grids, `p-4` padding | PASS |
| Tablet | 768px | Sidebar still hidden, 2-column grids for cards/stats, `p-4` padding | PASS |
| Desktop | 1280px | Sidebar fixed visible (`w-56` = 224px), 3-4 column grids, `p-6` padding | PASS |
| Wide | 1920px | Content capped at `max-w-[1600px]`, centered | PASS |

## Dark/Light Mode Analysis

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
4. **Fix gold color in light mode** -- replace hardcoded `#F6C85F` with a CSS variable

## Issue Summary

| Severity | Count | Issues |
|----------|-------|--------|
| High | 4 | #001 (fonts), #002 (Monaco light), #003 (chart cursor), #004 (gold contrast) |
| Medium | 7 | #005-#011 |
| Low | 11 | #012-#022 |
| **Total** | **22** | |

## License

See [LICENSE](LICENSE) file.
