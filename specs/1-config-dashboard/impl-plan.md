# Implementation Plan: Configuration Dashboard

**Feature**: 1-config-dashboard
**Branch**: `main` (current)
**Date**: 2026-04-02 (original) | 2026-04-09 (revised)
**Spec**: [spec.md](./spec.md)
**Data Model**: [data-model.md](./data-model.md)

---

## Technical Context

| Aspect | Value |
|--------|-------|
| Framework | Angular 13.3.x |
| UI Library | Angular Material 13.x |
| Language | TypeScript ~4.6.x |
| Node.js | ^14.15.0 or ^16.10.0 |
| Package Manager | npm |
| Styling | SCSS + custom Angular Material dark theme |
| Forms | Simple `@Input`/`@Output` pattern (no Reactive Forms on dashboard components) |
| State | Injectable services with BehaviorSubjects |
| Architecture | NgModule-per-component |
| Change Detection | `OnPush` on all components |
| Backend | Node.js/Express + WebSocket (`ws` library) |
| Grid Element | Native `<table>` with CSS column hover |

---

## Current State (What's Already Built)

Phases 0–3 from the original plan are **complete**. The following exists:

- Angular 13 project scaffolded with Material 13, dark theme, Google Fonts
- `AppDropdownComponent` (single-select) and `AppMultiDropdownComponent` (multi-select) with CVA directive
- `ConfigDashboardComponent` (layout orchestrator)
- `TopBarComponent` (Scenario dropdown + Realtime disable)
- `LeftPanelComponent` (container for CMD + Operations + footer)
- `CmdPanelComponent` (simple `@Input`/`@Output`, currently using driving sim names)
- `OperationsListComponent` (11 dropdowns, simple `@Input`/`@Output`, driving sim names)
- `StatusGridComponent` (right panel, currently uses `display: flex` with color-coded cells)
- `DashboardStateService` (left panel state, POST to `/api/config`)
- `StatusGridService` (right panel grid rows, WebSocket `/api/ws`, auto-reconnect)
- Node.js backend (Express + WebSocket) in `server/`
- Proxy config for dev mode (`proxy.conf.json`)
- All components use `ChangeDetectionStrategy.OnPush`

---

## What Changed (Completed in R1–R4, R6)

### 1. CMD Panel → Multi-Select with Side/Wheel Options

**Current**: Two single-select dropdowns with driving sim names (Transmission, Drive Mode)
**Target**: Two **multi-select** dropdowns:
- Side: Left, Right (default: first item)
- Wheel: 1, 2, 3, 4 (default: first item)

**Files**: `cmd-panel.component.*`, CMD models/config

### 2. Operations List → Specific Options per Dropdown

**Current**: 11 dropdowns, most with driving sim options (Terrain, Weather, etc.)
**Target**: 11 dropdowns with specific options as defined in FR-3.2:
- Dropdown 1: Not Active, Real, Captive
- Dropdown 2: No, Yes
- Dropdown 3 (Video rec): Internal, External
- Dropdown 4 (Video Type): **multi-select** — No, HD, 4K, 8K. Grid cell shows comma-separated abbreviations (e.g., "HD,4K")
- Dropdown 5: No, Yes
- Dropdown 6 (PWR On/Off): On, Off
- Dropdown 7 (Force): Normal, Force F, Force No
- Dropdowns 8–11: No, Yes

Each option must include an `abbr` field (3-letter abbreviation for grid cells).

**Files**: `operations-list.component.*`, operations config/constants

### 3. Grid → Native `<table>` with Abbreviation Cells

**Current**: `display: flex` layout with color-coded cells (colored backgrounds, text indicators)
**Target**: Native `<table>` element with:
- Column headers: L1, L2, L3, L4, R1, R2, R3, R4 (computed from CMD options)
- Cells: 3-letter abbreviations (no coloring)
- Column hover: light background tint on entire column
- Cell click: border + stronger background focus
- Support for additional custom columns via config
- Two `@Input`s: `config` (GridConfig) and `rows` (RowViewModel[])

**Files**: `status-grid.component.*`, grid models, `StatusGridService`

### 4. Right Panel → Labels Only (No Values)

**Current**: Each row shows label + confirmed value + grid cells
**Target**: Each row shows label only (no confirmed value) + grid cells

**Files**: `status-grid.component.html`, grid models

### 5. Top Bar → Scenario Only (No Reset Button)

**Current**: Scenario dropdown + Reset button in top bar
**Target**: Scenario dropdown only. Default button moved to footer.

**Files**: `top-bar.component.*`

### 6. Footer → Add Default Button

**Current**: Cancel + Save buttons
**Target**: Default + Cancel + Save buttons. Default resets left panel only (not right panel).

**Files**: `left-panel.component.*`, `config-dashboard.component.*`

### 7. Grid Config → Dynamic Columns from CMD

**Current**: Grid columns hardcoded (6 columns: red, yellow, green, N, P, L)
**Target**: Grid columns computed from CMD panel options (Side × Wheel = 8 base columns). Parent dashboard computes the config and passes it via `@Input`.

**Files**: `config-dashboard.component.*`, grid models, `StatusGridService`

### 8. `data-testid` Attributes

**Current**: None
**Target**: Every dropdown and dropdown option has a `data-testid` attribute for Playwright.

**Files**: `app-dropdown.component.html`, `app-multi-dropdown.component.html`, all dropdown consumers

### 9. Naming Abstraction Layer

**Current**: Labels are hardcoded strings in component configs
**Target**: Centralized key-value dictionary for all user-facing text, switchable by config/env.

**Files**: New `labels.ts` or similar dictionary file

### 10. Payload Format Update

**Current**: POST sends `DashboardState` with driving sim structure
**Target**: POST sends updated structure reflecting which wheels are affected + operation values.

**Files**: `DashboardStateService`, server `models.ts`, server `simulation-engine.ts`

---

## Implementation Phases (Revised)

### Phase R1: Grid Redesign (1 agent) ✅ COMPLETE

Convert the status grid from flex/color-coded to native `<table>` with text abbreviations.

| # | Task | Files |
|---|------|-------|
| R1.1 | Update `GridConfig` to include row definitions and column definitions (L1–R4 format) | `grid.models.ts` |
| R1.2 | Update `GridColumn` to remove `color`/`type` fields, add `header` field | `grid.models.ts` |
| R1.3 | Update `GridRow`/`RowViewModel` to use `abbr` strings instead of `active` booleans | `grid.models.ts` |
| R1.4 | Rewrite `status-grid.component.html` as a `<table>` with `<thead>` (L1–R4) and `<tbody>` | `status-grid.component.html` |
| R1.5 | Rewrite `status-grid.component.scss` for table styling, column hover, cell focus | `status-grid.component.scss` |
| R1.6 | Remove confirmed value display — labels only | `status-grid.component.html` |
| R1.7 | Update `StatusGridService` to emit `RowViewModel[]` with abbreviation strings | `status-grid.service.ts` |
| R1.8 | Update unit tests for new grid structure | `status-grid.component.spec.ts`, `status-grid.service.spec.ts` |

### Phase R2: CMD Panel Multi-Select (1 agent) ✅ COMPLETE

Convert CMD dropdowns to multi-select with Side/Wheel options.

| # | Task | Files |
|---|------|-------|
| R2.1 | Update CMD panel to use two `AppMultiDropdownComponent`s | `cmd-panel.component.*` |
| R2.2 | Define Side options (Left, Right) and Wheel options (1, 2, 3, 4) | CMD config constants |
| R2.3 | Update CMD value model: `{ sides: string[], wheels: string[] }` | CMD models |
| R2.4 | Wire grid column computation: Side × Wheel → L1, L2, ..., R4 | `config-dashboard.component.ts` |
| R2.5 | Update unit tests | `cmd-panel.component.spec.ts` |

### Phase R3: Operations List Specific Options (1 agent) ✅ COMPLETE

Replace generic driving sim options with specific per-dropdown options.

| # | Task | Files |
|---|------|-------|
| R3.1 | Define per-dropdown option configs with `abbr` fields | Operations config constants |
| R3.2 | Update dropdown 4 to use `AppMultiDropdownComponent` | `operations-list.component.html` |
| R3.3 | Assign specific labels to all 11 dropdowns | Operations config constants |
| R3.4 | Update default values for all dropdowns | `dashboard-defaults.ts` |
| R3.5 | Update unit tests | `operations-list.component.spec.ts` |

### Phase R4: Top Bar + Footer Changes (1 agent) ✅ COMPLETE

Move Default button to footer, remove Reset from top bar.

| # | Task | Files |
|---|------|-------|
| R4.1 | Remove Reset button from `TopBarComponent` | `top-bar.component.*` |
| R4.2 | Add Default button to `LeftPanelComponent` footer | `left-panel.component.*` |
| R4.3 | Add `@Output() defaultClicked` to `LeftPanelComponent` | `left-panel.component.ts` |
| R4.4 | Handle Default in `ConfigDashboardComponent` — reset left panel only | `config-dashboard.component.ts` |
| R4.5 | Update unit tests | `top-bar.component.spec.ts`, `left-panel.component.spec.ts`, `config-dashboard.component.spec.ts` |

### Phase R5: Infrastructure (1 agent)

Add `data-testid` attributes and naming abstraction layer.

| # | Task | Files |
|---|------|-------|
| R5.1 | Add `data-testid` to `AppDropdownComponent` template | `app-dropdown.component.html` |
| R5.2 | Add `data-testid` to `AppMultiDropdownComponent` template | `app-multi-dropdown.component.html` |
| R5.3 | Add `data-testid` to `mat-option` elements in both dropdown components | `app-dropdown.component.html`, `app-multi-dropdown.component.html` |
| R5.4 | Create centralized label dictionary (`labels.ts`) | New file |
| R5.5 | Update all components to source user-facing text from the dictionary | All component files |

### Phase R6: Backend Update (1 agent) ✅ COMPLETE

Update server to handle new payload format and emit abbreviation-based grid updates. Includes client-side abbreviation lookup via `StatusGridService`.

| # | Task | Files |
|---|------|-------|
| R6.1 | Update `DashboardState` model for new CMD structure (sides + wheels) | `server/src/models.ts` |
| R6.2 | Update `FieldUpdate` to carry abbreviation strings per column | `server/src/models.ts` |
| R6.3 | Update `processConfig` to generate abbreviation-based updates for affected wheels | `server/src/simulation-engine.ts` |
| R6.4 | Update Angular `DashboardStateService` POST payload | `dashboard-state.service.ts` |
| R6.5 | Update `StatusGridService` to process new `FieldUpdate` format | `status-grid.service.ts` |

### Phase R7: Polish & Verify (1 agent)

| # | Task |
|---|------|
| R7.1 | Visual QA — verify grid, dropdowns, hover, focus |
| R7.2 | Verify all unit tests pass |
| R7.3 | Verify `ng build --configuration production` succeeds |
| R7.4 | Test end-to-end: save → WS → grid update with abbreviations |
| R7.5 | Verify disabled state on Realtime scenario |

### Phase R8: Architecture & Code Quality Refactor (1 agent)

Addresses code review findings to improve naming, file organization, service decoupling, and template type safety. Prepares grid and operations components for reuse across multiple dashboards.

| # | Task | Files |
|---|------|-------|
| R8.1.1 | Rename `OperationsValue` → `FrequentOperationsModel` | `operations-list.models.ts`, all consumers |
| R8.1.2 | Rename `OperationsListComponent` → `FrequentOperationsListComponent` (class, selector, folder) | `operations-list/` → `frequent-operations-list/` |
| R8.1.3 | Update all imports, references, specs, modules | All affected files |
| R8.1.4 | Move `DashboardViewModel` to `models/dashboard-view.model.ts` | `config-dashboard.component.ts` |
| R8.1.5 | Rename `vm$` → `dashboardView$` | `config-dashboard.component.ts`, `.html` |
| R8.2.1 | Move `grid.models.ts` into `status-grid/` folder | `models/grid.models.ts` |
| R8.2.2 | Move `status-grid.service.ts` into `status-grid/` folder | `services/status-grid.service.ts` |
| R8.2.3 | Move `status-grid.service.spec.ts` into `status-grid/` folder | `services/status-grid.service.spec.ts` |
| R8.2.4 | Move grid builders into `status-grid/grid-defaults.ts` | `dashboard-defaults.ts` |
| R8.2.5 | Update all import paths | All affected files |
| R8.3.1 | Extract `AbbrLookup` + `buildAbbrLookup()` to `status-grid/abbr-lookup.ts` | `status-grid.service.ts` |
| R8.3.2 | Make `StatusGridService` accept abbr lookup via `configure()` instead of importing `OPERATIONS_FIELDS` | `status-grid.service.ts` |
| R8.3.3 | Have `ConfigDashboardComponent` build and pass the lookup | `config-dashboard.component.ts` |
| R8.3.4 | Update tests for decoupled service | `status-grid.service.spec.ts` |
| R8.4.1 | Extract WebSocket connection logic to `status-grid/ws-connection.ts` | `status-grid.service.ts` |
| R8.4.2 | `StatusGridService` uses extracted connection utility | `status-grid.service.ts` |
| R8.4.3 | Move `RECONNECT_DELAY_MS` to connection utility | `status-grid.service.ts` |
| R8.4.4 | Update tests for connection extraction | `status-grid.service.spec.ts` |
| R8.5.1 | Replace `$any()` in operations template with typed helper methods | `operations-list.component.html`, `.ts` |
| R8.5.2 | Update component tests for typed helpers | `operations-list.component.spec.ts` |

---

## Parallelism Map

```
Completed: R1, R2, R3, R4, R6, Code Review Fixes

Remaining:
Phase R5 (Testing & Naming) ──┐
Phase R8 (Refactor)           ├──► Phase R7 (Polish & Verify)
                              ┘
```

R5 and R8 are independent and can run in parallel.
R7 depends on both R5 and R8.

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| `<table>` column hover requires JS or CSS `:has()` which isn't in Angular 13 target browsers | Medium | Medium | Use JS-based column hover via `mouseenter`/`mouseleave` on `<td>` elements with column index class toggling |
| `abbr` field missing from some dropdown options | Low | High | Define all `abbr` values upfront in option configs; validate at build time |
| Multi-select abbreviation display in grid cells may overflow | Medium | Low | Truncate or use tooltip for overflow; design cells with `min-width` |
| Naming abstraction adds indirection for simple labels | Low | Low | Keep dictionary flat and simple; avoid over-engineering |
| R8 renaming touches many files — risk of broken imports | Medium | Medium | Run full test suite after each rename sub-task; commit incrementally |
| Decoupling `StatusGridService` from `OPERATIONS_FIELDS` changes the initialization API | Low | Medium | Ensure `ConfigDashboardComponent` passes lookup on init; add integration test |
