# Tasks: Configuration Dashboard (Revised)

**Feature**: 1-config-dashboard
**Branch**: `main`
**Generated**: 2026-04-02 (original) | 2026-04-09 (revised) | 2026-04-16 (current)
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

## Completed Phases (Revised Plan — R1–R4, R6, R8)

All core revised phases are **complete**:

- [x] Phase R1: Grid Redesign — native `<table>`, abbreviation cells, column hover, cell focus
- [x] Phase R2: CMD Panel Multi-Select — Side (Left/Right) × Wheel (1–4), grid columns L1–R4
- [x] Phase R3: Operations List — 11 specific dropdowns with `abbr` fields, YES/NO dedup
- [x] Phase R4: Top Bar + Footer — Scenario only in top bar, Default+Cancel+Save in footer
- [x] Phase R6: Backend Update — new payload format, client-side abbreviation lookup, WebSocket integration
- [x] Code Review Fixes — saveConfig rollback, null setter reset, SCSS theme tokens, comma trim, Omit<> dedup
- [x] Phase R8: Architecture & Code Quality Refactor — naming, file organization, service decoupling, template type safety

---

## Completed Phases (Post-R8 — Tabbed Dashboard)

- [x] CMD Test Panel — 3 YES/NO dropdowns for CMD testing section in Tab 1
- [x] Sticky header/footer layout — CMD panel (top) and footer (bottom) are sticky
- [x] PanelFooterComponent — Extracted shared footer (Default/Cancel/Save) to dedicated component
- [x] Tabbed Dashboard Architecture — DashboardWrapperComponent with TopBar + mat-tab-group
  - [x] DashboardWrapperComponent shell with TopBar above tab strip
  - [x] FrequentCmdsTabComponent (Tab 1) — refactored from ConfigDashboardComponent
  - [x] RareCmdsTabComponent (Tab 2) — placeholder, then full implementation
  - [x] WsService — shared WebSocket service at wrapper level
  - [x] Global SCSS partials for Material overrides (no ::ng-deep)
  - [x] Folder restructure — config-dashboard → dashboard-wrapper, colocation of related code
- [x] Rare CMDs Tab Implementation (branch: 8-rare-cmds-tab)
  - [x] Backend: RareDashboardState models, processRareConfig(), POST/GET /api/rare-config
  - [x] RareOperationsListComponent — 10 dropdowns (9 Normal/Force/Ignore, 1 Yes/No)
  - [x] RareLeftPanelComponent — RareOperationsList + PanelFooter
  - [x] Grid integration — buildRareGridRowDefs(), RARE_GRID_CONFIG with TTL/TTR/SSL columns
  - [x] Both left panels use shared PanelFooterComponent
  - [x] Unit tests: 178 tests passing
- [x] State Service Consolidation
  - [x] Generic TabStateService<T> with TAB_STATE_CONFIG InjectionToken
  - [x] Removed separate DashboardStateService and RareStateService
  - [x] TabStateConfig<T> interface with defaultState + apiUrl
- [x] CMD Panel Lift to Tab Level
  - [x] CmdPanelComponent rendered at tab component level (above left/right split)
  - [x] Removed CmdPanel from LeftPanel and RareLeftPanel
- [x] Fixed Container Layout
  - [x] Dashboard constrained to 1120px × 500px, bottom-left fixed position
  - [x] Compact spacing adjustments across all components
  - [x] Left/right panel flex ratio 2.5/7.5
  - [x] Custom thin scrollbar on left panels
- [x] Grid Enhancements
  - [x] CellValue interface with value + abbr (server-side abbreviation resolution)
  - [x] Cell hover pop-out animation showing full value text
  - [x] Column hover visual effect with background tint and border
  - [x] Rare grid extra columns: TTL, TTR, SSL
- [x] Code Quality
  - [x] readonly on all @Output() EventEmitter properties
  - [x] data-test-id on CMD panel dropdowns (cmd-sides, cmd-wheels)
  - [x] data-test-id on grid cells (cell-{field}-{columnId})
  - [x] Model/interface naming: FrequentOperationsModel, CmdTestModel, RareOperationsModel
  - [x] File path: operations-list → frequent-operations-list

---

## Phase R5: Testing & Naming Infrastructure ✅ COMPLETE

**Status**: Complete

**Goal**: Add `data-testid` attributes to interactive elements. Create naming swap system for domain-specific identifiers.

- [x] R5.1 `TestIdDirective` (`appTestId`) created in `src/app/shared/directives/`
- [x] R5.2 `[testId]` on `AppDropdownComponent` and `AppMultiDropdownComponent` (bound to `data-test-id`)
- [x] R5.3 CMD panel dropdowns: `cmd-sides`, `cmd-wheels`
- [x] R5.4 Grid cells: `cell-{field}-{columnId}` via `[appTestId]`
- [x] R5.5 `[appTestId]="option.value"` on `mat-option` elements in both dropdown components
- [x] R5.6 Created `tools/naming-map.json` (domain identifier mapping) + `tools/rename.sh` (automated rename script)
- [x] R5.7 Documented naming swap process in `specs/1-config-dashboard/naming-swap.md`

---

## Phase R7: Polish & Verify

**Status**: Pending (R5 + R8 are complete)

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

## Phase R8: Architecture & Code Quality Refactor ✅ COMPLETE

**Status**: Complete

All items addressed — naming, file organization, service decoupling, template type safety, WebSocket extraction.

- [x] R8.1 Rename for Domain Clarity (DashboardViewModel, dashboardView$)
- [x] R8.2 Colocate Grid Files (grid.models.ts, status-grid.service.ts, grid-defaults.ts → status-grid/)
- [x] R8.3 Decouple Grid Service (AbbrLookup, buildAbbrLookup(), configure() method)
- [x] R8.4 Extract WebSocket Connection (ws-connection.ts, WsService)
- [x] R8.5 Template Type Safety (typed helper methods replacing $any() casts)

---

## Remaining Phases

### Phase R5: Testing & Naming Infrastructure ✅ COMPLETE

- [x] R5.1–R5.5 `TestIdDirective`, dropdown testIds, grid cell testIds, mat-option testIds
- [x] R5.6 `tools/naming-map.json` + `tools/rename.sh` — JSON-driven automated naming swap
- [x] R5.7 `specs/1-config-dashboard/naming-swap.md` — usage guide, git workflow, troubleshooting

### Phase R7: Polish & Verify

**Status**: Pending (R5 complete, ready to start)

- [ ] R7.1 Visual QA — verify grid, dropdowns, hover/popout, column highlight across both tabs
- [ ] R7.2 Verify disabled state on "Realtime" scenario across both tabs
- [ ] R7.3 Verify Default button resets left panel only per tab
- [ ] R7.4 Verify all unit tests pass
- [ ] R7.5 Verify production build
- [ ] R7.6 End-to-end test: save → WS → grid update for both frequent and rare CMDs
- [ ] R7.7 Verify `data-testid` attributes present on all interactive elements

---

## Dependency Graph

```
Phase R5 (Testing & Naming) ──► Phase R7 (Polish & Verify)
```

---

## Summary

| Metric | Value |
|--------|-------|
| Completed phases | R1, R2, R3, R4, R5, R6, R8, Code Review, Tabbed Dashboard, Rare CMDs, State Consolidation, CMD Lift, Fixed Layout, Grid Enhancements, Code Quality, Naming Swap |
| Remaining phases | R7 (Polish & Verify) |
| Critical path | R5 → R7 |
