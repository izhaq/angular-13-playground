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

## Phase R1: Grid Redesign

**Goal**: Convert the status grid from flex/color-coded to a native `<table>` with text abbreviation cells, column hover, and cell focus.

**Completion gate**: Grid renders as a `<table>`, cells show 3-letter abbreviations, column hover and cell focus work, no coloring.

- [ ] R1.1 Update `GridConfig` interface to include row definitions (`{ field, label }[]`) and column definitions (`{ id, header }[]`)
- [ ] R1.2 Update `GridColumn` interface: remove `color` and `type` fields, add `header: string`
- [ ] R1.3 Update `RowViewModel` to use `cells: Record<string, string>` (columnId → abbreviation string, empty = blank)
- [ ] R1.4 Rewrite `status-grid.component.html` as a `<table>` with `<thead>` (column headers: L1–R4) and `<tbody>` (rows with labels + abbreviation cells)
- [ ] R1.5 Rewrite `status-grid.component.scss`: table styling, bordered cells, column hover (light background tint), cell click focus (border + stronger background)
- [ ] R1.6 Remove confirmed value display — show labels only (no values column)
- [ ] R1.7 Update `StatusGridService.applyUpdate()` to work with abbreviation-based `RowViewModel[]`
- [ ] R1.8 Update `status-grid.component.spec.ts` and `status-grid.service.spec.ts` for new structure

---

## Phase R2: CMD Panel Multi-Select

**Goal**: Convert CMD dropdowns to multi-select with Side (Left/Right) and Wheel (1/2/3/4) options. Wire grid column computation from CMD selections.

**Completion gate**: CMD panel shows two multi-select dropdowns with correct options, grid columns are L1–R4.

- [ ] R2.1 Replace both `AppDropdownComponent`s in CmdPanel with `AppMultiDropdownComponent`s
- [ ] R2.2 Define Side options (`[{ value: 'left', label: 'Left', abbr: 'L' }, { value: 'right', label: 'Right', abbr: 'R' }]`) and Wheel options (`[{ value: '1', label: '1' }, ..., { value: '4', label: '4' }]`)
- [ ] R2.3 Update CMD value model from `{ transmission: string, driveMode: string }` to `{ sides: string[], wheels: string[] }`
- [ ] R2.4 In `ConfigDashboardComponent`, compute grid column definitions from Side × Wheel (L1, L2, L3, L4, R1, R2, R3, R4) and pass via `@Input` to StatusGrid
- [ ] R2.5 Update `cmd-panel.component.spec.ts`

---

## Phase R3: Operations List — Specific Options per Dropdown

**Goal**: Replace generic driving sim options with specific per-dropdown options and labels. Each option must include an `abbr` field.

**Completion gate**: All 11 dropdowns show correct labels and options with abbreviations.

- [ ] R3.1 Define per-dropdown option configs with `abbr` fields:
  - Row 1 (TTM): Not Active (N/A), Real (REA), Captive (CAP)
  - Row 2 (Weather): No (NO), Yes (YES)
  - Row 3 (Video rec): Internal (INT), External (EXT)
  - Row 4 (Video Type, **multi-select**): No (NO), HD (HD), 4K (4K), 8K (8K). Grid cell shows comma-separated abbreviations (e.g., "HD,4K")
  - Row 5 (Headlights): No (NO), Yes (YES)
  - Row 6 (PWR On/Off): On (ON), Off (OFF)
  - Row 7 (Force): Normal (NRM), Force F (FRC), Force No (FNO)
  - Row 8 (Stability): No (NO), Yes (YES)
  - Row 9 (Cruise Ctrl): No (NO), Yes (YES)
  - Row 10 (PLR): No (NO), Yes (YES)
  - Row 11 (AUX): No (NO), Yes (YES)
- [ ] R3.2 Update dropdown 4 to use `AppMultiDropdownComponent`. Revert dropdowns 1 and 2 from multi-select back to single-select (they were made multi-select in driving sim phase but now only dropdown 4 is multi-select)
- [ ] R3.3 Assign specific labels to all 11 dropdowns (TTM, Weather, Video rec, Video Type, Headlights, PWR On/Off, Force, Stability, Cruise Ctrl, PLR, AUX)
- [ ] R3.4 Update `OperationsValue` interface keys to match new labels: `ttm`, `weather`, `videoRec`, `videoType`, `headlights`, `pwrOnOff`, `force`, `stability`, `cruiseCtrl`, `plr`, `aux`
- [ ] R3.5 Update default values in `dashboard-defaults.ts`
- [ ] R3.6 Update `operations-list.component.spec.ts`

---

## Phase R4: Top Bar + Footer Changes

**Goal**: Remove Reset button from top bar. Add Default button to footer next to Cancel/Save.

**Completion gate**: Top bar has Scenario dropdown only. Footer has Default + Cancel + Save. Default resets left panel only.

- [ ] R4.1 Remove Reset button and `resetClicked` output from `TopBarComponent`
- [ ] R4.2 Add Default button to `LeftPanelComponent` footer (next to Cancel and Save)
- [ ] R4.3 Add `@Output() defaultClicked` to `LeftPanelComponent`
- [ ] R4.4 Handle `defaultClicked` in `ConfigDashboardComponent` — call `DashboardStateService.resetToDefaults()` for left panel only (do NOT call `StatusGridService.resetToDefaults()`)
- [ ] R4.5 Remove `onReset()` handling from TopBar wiring in `ConfigDashboardComponent`
- [ ] R4.6 Update `top-bar.component.spec.ts`, `left-panel.component.spec.ts`, `config-dashboard.component.spec.ts`

---

## Phase R5: Testing & Naming Infrastructure

**Goal**: Add `data-testid` attributes to all dropdowns/options. Create centralized label dictionary for naming swap.

**Completion gate**: All dropdowns and options have `data-testid`. Label dictionary exists and is used by components.

- [ ] R5.1 Add `[attr.data-testid]` binding to `AppDropdownComponent` template (on the `mat-select` element)
- [ ] R5.2 Add `[attr.data-testid]` binding to `AppMultiDropdownComponent` template
- [ ] R5.3 Add `[attr.data-testid]` to each `mat-option` element in both dropdown components (e.g., `data-testid="option-{value}"`)
- [ ] R5.4 Create centralized label dictionary (`src/app/labels/labels.ts` or similar) — a flat key-value map
- [ ] R5.5 Update all components to source user-facing text from the dictionary
- [ ] R5.6 Document the naming swap process (how to provide an alternate dictionary for confidential deployment)

---

## Phase R6: Backend Update

**Goal**: Update the Node.js server and Angular services for the new payload format and abbreviation-based grid updates.

**Completion gate**: POST payload uses new structure, WebSocket emits abbreviation-based FieldUpdate messages, grid updates correctly.

**Prerequisites**: R1 + R2 + R3 (finalized models and interfaces)

- [ ] R6.1 Update `DashboardState` interface in `server/src/models.ts` for new CMD structure (`sides: string[], wheels: string[]` instead of `transmission`/`driveMode`)
- [ ] R6.2 Update `FieldUpdate` interface to carry abbreviation strings per column (e.g., `cells: Record<string, string>`)
- [ ] R6.3 Update `processConfig` in `server/src/simulation-engine.ts` to generate abbreviation-based updates for affected wheels
- [ ] R6.4 Update Angular `DashboardStateService` to construct and POST the new payload format
- [ ] R6.5 Update `StatusGridService` to process new `FieldUpdate` format and update `RowViewModel[]`
- [ ] R6.6 Update service unit tests

---

## Phase R7: Polish & Verify

**Goal**: End-to-end verification, visual QA, all tests pass.

**Completion gate**: All features work end-to-end, all tests green, production build clean.

**Prerequisites**: All previous phases complete.

- [ ] R7.1 Visual QA — verify grid table rendering, column headers, abbreviation cells, hover/focus
- [ ] R7.2 Verify disabled state on "Realtime" scenario selection
- [ ] R7.3 Verify Default button resets left panel only (right panel unchanged)
- [ ] R7.4 Verify all unit tests pass (`npx ng test --watch=false --browsers=ChromeHeadless`)
- [ ] R7.5 Verify production build (`npx ng build --configuration production`)
- [ ] R7.6 End-to-end test: save → WS → grid update with abbreviations for selected wheels
- [ ] R7.7 Verify `data-testid` attributes present on all dropdowns and options

---

## Dependency Graph

```
Phase R1 (Grid Redesign)    ──┐
Phase R2 (CMD Multi-Select) ──┼──► Phase R6 (Backend) ──► Phase R7 (Polish)
Phase R3 (Operations Options)─┤
Phase R4 (Top Bar + Footer) ──┘
Phase R5 (Infrastructure)  ───┘
```

**Parallel opportunities**: R1, R2, R3, R4, R5 are fully independent (different files).

---

## Summary

| Metric | Value |
|--------|-------|
| New tasks (this revision) | 38 |
| Phases | 7 (R1–R7) |
| Max parallel agents | 5 (R1–R5) |
| Critical path | R1 + R2 + R3 → R6 → R7 |
| Previously completed tasks | All original phases (60+ tasks) |
