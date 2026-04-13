# Tasks: Configuration Dashboard (Revised)

**Feature**: 1-config-dashboard
**Branch**: `main`
**Generated**: 2026-04-02 (original) | 2026-04-09 (revised)
**Spec**: [spec.md](./spec.md)
**Plan**: [impl-plan.md](./impl-plan.md)
**Data Model**: [data-model.md](./data-model.md)

---

## Completed Phases (Original Plan)

All original phases (Phase 1–3, Phase 2.5, plus simplifications and server integration) are **complete**:

- [x] Phase 1: Project Setup (Angular 13 + Material 13)
- [x] Phase 2: Foundation Layer (AppDropdown, Models+Service, Dark Theme)
- [x] Phase 2.5: Dashboard Skeleton
- [x] Phase 3: Component Layer (TopBar, CmdPanel, OperationsList, StatusGrid, LeftPanel)
- [x] Simplification: Remove Reactive Forms from dashboard components → `@Input`/`@Output` pattern
- [x] Simplification: Remove "Form" naming convention from components
- [x] Driving simulation theming and multi-select dropdowns (opr1, opr2)
- [x] OnPush change detection on all components
- [x] Realtime scenario → disable left panel
- [x] Code simplification review and fixes
- [x] Grid layout: flex → simpler flex (was considering CSS Grid)
- [x] Server integration: Node.js Express + WebSocket
- [x] Proxy config for dev mode
- [x] Layout responsiveness fixes
- [x] WebSocket connection fix (/ws → /api/ws)
- [x] Missing test coverage (LeftPanel, ConfigDashboard specs)

---

## Completed Phases (Revised Plan — R1–R4, R6)

All core revised phases are **complete**:

- [x] Phase R1: Grid Redesign — native `<table>`, abbreviation cells, column hover, cell focus
- [x] Phase R2: CMD Panel Multi-Select — Side (Left/Right) × Wheel (1–4), grid columns L1–R4
- [x] Phase R3: Operations List — 11 specific dropdowns with `abbr` fields, YES/NO dedup
- [x] Phase R4: Top Bar + Footer — Scenario only in top bar, Default+Cancel+Save in footer
- [x] Phase R6: Backend Update — new payload format, client-side abbreviation lookup, WebSocket integration
- [x] Code Review Fixes — saveConfig rollback, null setter reset, SCSS theme tokens, comma trim, Omit<> dedup

---

## Phase R5: Testing & Naming Infrastructure

**Status**: Pending

**Goal**: Add `data-testid` attributes to all dropdowns/options. Create centralized label dictionary for naming swap.

**Completion gate**: All dropdowns and options have `data-testid`. Label dictionary exists and is used by components.

- [ ] R5.1 Add `[attr.data-testid]` binding to `AppDropdownComponent` template (on the `mat-select` element)
- [ ] R5.2 Add `[attr.data-testid]` binding to `AppMultiDropdownComponent` template
- [ ] R5.3 Add `[attr.data-testid]` to each `mat-option` element in both dropdown components (e.g., `data-testid="option-{value}"`)
- [ ] R5.4 Create centralized label dictionary (`src/app/labels/labels.ts` or similar) — a flat key-value map
- [ ] R5.5 Update all components to source user-facing text from the dictionary
- [ ] R5.6 Document the naming swap process (how to provide an alternate dictionary for confidential deployment)

---

## Phase R7: Polish & Verify

**Status**: Pending (depends on R5 + R8)

**Goal**: End-to-end verification, visual QA, all tests pass.

**Completion gate**: All features work end-to-end, all tests green, production build clean.

- [ ] R7.1 Visual QA — verify grid table rendering, column headers, abbreviation cells, hover/focus
- [ ] R7.2 Verify disabled state on "Realtime" scenario selection
- [ ] R7.3 Verify Default button resets left panel only (right panel unchanged)
- [ ] R7.4 Verify all unit tests pass (`npx ng test --watch=false --browsers=ChromeHeadless`)
- [ ] R7.5 Verify production build (`npx ng build --configuration production`)
- [ ] R7.6 End-to-end test: save → WS → grid update with abbreviations for selected wheels
- [ ] R7.7 Verify `data-testid` attributes present on all dropdowns and options

---

## Phase R8: Architecture & Code Quality Refactor

**Status**: Pending

**Goal**: Address code review findings — improve naming, file organization, service decoupling, and template type safety. Prepare the grid and operations components for reuse across multiple dashboards (frequent vs. less-frequent operations).

**Completion gate**: All items below are addressed, all tests pass, no regressions.

### R8.1 Rename for Domain Clarity

- [ ] R8.1.1 Rename `OperationsValue` → `FrequentOperationsModel` (interface)
- [ ] R8.1.2 Rename `OperationsListComponent` → `FrequentOperationsListComponent` (class, selector: `app-frequent-operations-list`, folder: `frequent-operations-list/`)
- [ ] R8.1.3 Update all imports, references, spec files, and module declarations
- [ ] R8.1.4 Rename `DashboardViewModel` → move to `models/dashboard-view.model.ts`
- [ ] R8.1.5 Rename `vm$` → `dashboardView$` in `ConfigDashboardComponent`

### R8.2 Colocate Grid Files

- [ ] R8.2.1 Move `models/grid.models.ts` → `components/status-grid/grid.models.ts`
- [ ] R8.2.2 Move `services/status-grid.service.ts` → `components/status-grid/status-grid.service.ts`
- [ ] R8.2.3 Move `services/status-grid.service.spec.ts` → `components/status-grid/status-grid.service.spec.ts`
- [ ] R8.2.4 Move grid-specific builders (`buildInitialGridRows`, `buildGridRowDefs`) from `dashboard-defaults.ts` → `components/status-grid/grid-defaults.ts`
- [ ] R8.2.5 Update all import paths

### R8.3 Decouple Grid Service from Operations

The grid service currently imports `OPERATIONS_FIELDS` directly to build abbreviation lookups. This prevents reuse with a different set of fields (e.g., less-frequent operations dashboard).

- [ ] R8.3.1 Extract `AbbrLookup` type and `buildAbbrLookup()` to `components/status-grid/abbr-lookup.ts`
- [ ] R8.3.2 Make `StatusGridService` accept the abbreviation lookup via a method (e.g., `configure(abbrLookup, columns)`) instead of importing `OPERATIONS_FIELDS` internally
- [ ] R8.3.3 Have `ConfigDashboardComponent` build and pass the lookup during initialization
- [ ] R8.3.4 Update tests

### R8.4 Extract WebSocket Connection

- [ ] R8.4.1 Extract WebSocket connection/reconnect logic to `components/status-grid/ws-connection.ts` (pure utility, not a service)
- [ ] R8.4.2 `StatusGridService` uses the extracted connection utility
- [ ] R8.4.3 Move `RECONNECT_DELAY_MS` to the connection utility file
- [ ] R8.4.4 Update tests

### R8.5 Template Type Safety

- [ ] R8.5.1 Replace `$any(value[field.key])` in `operations-list.component.html` with typed helper methods (`getStringValue(key)`, `getArrayValue(key)`)
- [ ] R8.5.2 Update component tests to cover the new methods

---

## Dependency Graph

```
Phase R5 (Testing & Naming) ──┐
Phase R8 (Refactor)           ├──► Phase R7 (Polish & Verify)
                              ┘
```

R5 and R8 are independent and can run in parallel.
R7 depends on both R5 and R8.

---

## Summary

| Metric | Value |
|--------|-------|
| Completed phases | R1, R2, R3, R4, R6, Code Review Fixes |
| Remaining phases | R5, R7, R8 |
| New tasks (R8) | 16 |
| Critical path | R5 + R8 → R7 |
| Previously completed tasks | All original phases (60+) + R1–R4, R6 |
