# Implementation Plan: Configuration Dashboard

**Feature**: 1-config-dashboard
**Branch**: `1-config-dashboard`
**Date**: 2026-04-02
**Spec**: [spec.md](./spec.md)
**Research**: [research.md](./research.md)

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
| Forms | Reactive Forms (`ReactiveFormsModule`) |
| State | Injectable service with BehaviorSubjects |
| Architecture | NgModule-per-component (7 feature modules: AppDropdown, TopBar, CmdFormPanel, OperationsFormList, LeftPanel, StatusGrid, ConfigDashboard) |
| CVA Components | AppDropdown, CmdFormPanel, OperationsFormList |

---

## Implementation Phases

### Overview & Parallelism Map

```
TIME ──────────────────────────────────────────────────────────────►

PHASE 0 ─── Project Setup (sequential, one agent)
  │
  ▼
PHASE 1 ─── Foundation Layer
  │
  ├── Agent A: AppDropdownModule + AppDropdownComponent (CVA)
  ├── Agent B: DashboardFormService + StatusGridService + mock data + interfaces/models
  └── Agent C: Dark theme SCSS + Google Fonts setup
  │
  ▼ (wait for AppDropdown to complete)
  │
PHASE 2 ─── Dashboard Skeleton (sequential, one agent)
  │
  └── Agent A: ConfigDashboardModule + ConfigDashboardComponent
               Two-panel layout shell with placeholder content (layout orchestrator only)
  │
  ▼
PHASE 3 ─── Component Layer (parallel leaf components, then left-panel composer)
  │
  ├── Agent A: TopBarModule + TopBarComponent
  ├── Agent B: CmdFormPanelModule + CmdFormPanelComponent (CVA, uses AppDropdown)
  ├── Agent C: OperationsFormListModule + OperationsFormListComponent (CVA, uses AppDropdown)
  └── Agent D: StatusGridModule + StatusGridComponent
  │
  ▼ (wait for Phase 3B + 3C — CmdFormPanel + OperationsFormList modules exist)
  │
  └── Agent E: LeftPanelModule + LeftPanelComponent
               Imports CmdFormPanelModule + OperationsFormListModule + ReactiveFormsModule
               Owns FormGroup { commands, operations }; template hosts
               <app-cmd-form-panel> + <app-operations-form-list> + Save/Cancel
  │
  ▼ (wait for all Phase 3 agents including 3E)
  │
PHASE 4 ─── Dashboard Wiring (sequential, one agent)
  │
  └── Agent A: ConfigDashboard imports LeftPanelModule (not CmdFormPanel/OperationsFormList directly)
               No FormGroup on dashboard; no ReactiveFormsModule on ConfigDashboardModule
               Wire <app-left-panel> @Input/@Output + TopBar + StatusGrid + services
  │
  ▼
PHASE 5 ─── Polish & Verify (sequential)
  │
  └── Visual QA, theme tuning, smoke test

Architecture slice (integration view):

  ConfigDashboardComponent (layout orchestrator)
        │
        ├── TopBarComponent
        │
        ├── LeftPanelComponent  ← FormGroup { commands, operations }
        │        ├── CmdFormPanelComponent      (CVA)
        │        └── OperationsFormListComponent (CVA)
        │
        └── StatusGridComponent
```

---

### Phase 0: Project Setup (Sequential — 1 agent)

**Goal**: Scaffold Angular 13 project with Angular Material 13 in the existing repo.

**Prerequisites**: Node.js 14.x or 16.x installed, npm available.

| # | Task | Files Created/Modified |
|---|------|----------------------|
| 0.1 | Run `npx @angular/cli@13 new angular-13-playground --directory=. --style=scss --routing=false --skip-git=true` | `angular.json`, `package.json`, `tsconfig.json`, `src/` tree |
| 0.2 | Run `ng add @angular/material@13` with custom theme, animations enabled | `package.json`, `angular.json`, `src/styles.scss` |
| 0.3 | Add Google Fonts (Manrope, Inter) to `src/index.html` | `src/index.html` |
| 0.4 | Create `src/app/components/` directory structure (generic folders + `config-dashboard/` with `components/` for nested dashboard pieces) | Empty directories |
| 0.5 | Create `src/app/mocks/` directory for project-wide mock data | Empty directory |
| 0.6 | Create `src/app/components/config-dashboard/models/` and `src/app/components/config-dashboard/services/` for dashboard-specific shared models and services | Empty directories |
| 0.7 | Verify `ng serve` compiles and runs without errors | — |

**Completion gate**: `ng serve` shows the default Angular welcome page.

---

### Phase 1: Foundation Layer (Parallel — up to 3 agents)

**Goal**: Build the atomic reusable component, shared service, and visual theme — the three pillars everything else depends on.

#### Agent A: AppDropdownModule (Foundation component)

**Files touched**: `src/app/components/app-dropdown/*` only

| # | Task | Files |
|---|------|-------|
| 1A.1 | Define `DropdownOption` interface (co-located with the component) | `src/app/components/app-dropdown/app-dropdown.models.ts` |
| 1A.2 | Create `AppDropdownModule` declaring and exporting `AppDropdownComponent` | `src/app/components/app-dropdown/app-dropdown.module.ts` |
| 1A.3 | Implement `AppDropdownComponent` with CVA (`ControlValueAccessor`) wrapping `mat-select` | `src/app/components/app-dropdown/app-dropdown.component.ts` |
| 1A.4 | Create template with `mat-select`, `mat-option` iteration, label support | `src/app/components/app-dropdown/app-dropdown.component.html` |
| 1A.5 | Style the dropdown to match dark theme (override mat-select colors) | `src/app/components/app-dropdown/app-dropdown.component.scss` |
| 1A.6 | Write unit tests for CVA behavior (writeValue, registerOnChange, registerOnTouched, setDisabledState) | `src/app/components/app-dropdown/app-dropdown.component.spec.ts` |

**Inputs**: `@Input() options: DropdownOption[]`, `@Input() label: string`, `@Input() placeholder: string`

**CVA Contract**: Reads/writes a single `string` value.

#### Agent B: Models + DashboardFormService + StatusGridService

**Files touched**: `src/app/components/config-dashboard/models/*`, `src/app/components/config-dashboard/services/*`, `src/app/mocks/*` only

**Co-location rule**: Dashboard-specific models and services live under `config-dashboard/`. Project-wide mock data lives under `src/app/mocks/`. Component-specific models (e.g., `DropdownOption`) are created by the component's own agent.

| # | Task | Files |
|---|------|-------|
| 1B.1 | Define shared dashboard interfaces: `DashboardFormValue`, `GridCell`, `GridRow`, `GridColumn`, `GridConfig`, `FieldUpdate` | `src/app/components/config-dashboard/models/grid.models.ts`, `src/app/components/config-dashboard/models/dashboard-form.models.ts` |
| 1B.2 | Define dashboard default values: `DEFAULT_FORM_VALUE`, `buildInitialGridRows()` | `src/app/components/config-dashboard/models/dashboard-defaults.ts` |
| 1B.3 | Define project-wide mock data constants: actions list, command options, operation options, grid columns, `DEFAULT_GRID_CONFIG` | `src/app/mocks/mock-data.ts` |
| 1B.4 | Create `DashboardFormService` with: `formState$`, `availableOptions$`, `savedBaseline`, `saveConfig()`, `cancelChanges()`, `resetToDefaults()` | `src/app/components/config-dashboard/services/dashboard-form.service.ts` |
| 1B.5 | Create `StatusGridService` with: `gridRows$` (seeded from defaults), `applyUpdate(FieldUpdate)`, `connect()`, `resetToDefaults()` | `src/app/components/config-dashboard/services/status-grid.service.ts` |
| 1B.6 | Write unit tests for `DashboardFormService` (state updates, save/cancel/reset) | `src/app/components/config-dashboard/services/dashboard-form.service.spec.ts` |
| 1B.7 | Write unit tests for `StatusGridService` (initial seed, applyUpdate with full row / value-only / single cell) | `src/app/components/config-dashboard/services/status-grid.service.spec.ts` |

#### Agent C: Dark Theme + Typography

| # | Task | Files |
|---|------|-------|
| 1C.1 | Create custom Angular Material dark theme palette using Stitch colors | `src/styles.scss` or `src/theme.scss` |
| 1C.2 | Define SCSS variables for surface tokens (`$surface`, `$surface-container-low`, etc.) | `src/styles/_variables.scss` |
| 1C.3 | Configure typography using Manrope (headlines) and Inter (body/labels) | `src/styles.scss` |
| 1C.4 | Set global body styles: background `#0e0e0e`, text `#e7e5e4`, font-family | `src/styles.scss` |
| 1C.5 | Verify theme renders correctly with `ng serve` | — |

**Completion gate**: AppDropdown works with CVA in isolation, service compiles, theme applies globally.

---

### Phase 2: Dashboard Skeleton (Sequential — 1 agent)

**Goal**: Create the `ConfigDashboardComponent` shell with the two-panel flex layout, populated with placeholder content so the overall structure is visually verifiable before building child components.

**Prerequisites**: Phase 1 complete (theme applies, service compiles).

| # | Task | Files |
|---|------|-------|
| 2.1 | Create `ConfigDashboardModule` importing `CommonModule`, `MatButtonModule` | `src/app/components/config-dashboard/config-dashboard.module.ts` |
| 2.2 | Create `ConfigDashboardComponent` as a shell — no form logic yet | `src/app/components/config-dashboard/config-dashboard.component.ts` |
| 2.3 | Create template with two-panel flex layout, placeholder sections: "TopBar goes here", "CMD goes here", "OPERATIONS goes here" (left), "StatusGrid goes here" (right), Cancel + Save buttons (bottom-right) | `src/app/components/config-dashboard/config-dashboard.component.html` |
| 2.4 | Style: two-panel flex layout (40/60 split), dark surface backgrounds, spacing tokens, footer button positioning | `src/app/components/config-dashboard/config-dashboard.component.scss` |
| 2.5 | Update `AppModule` to import `ConfigDashboardModule`, place `<app-config-dashboard>` in `app.component.html` | `src/app/app.module.ts`, `src/app/app.component.html` |
| 2.6 | Verify skeleton renders correctly with `ng serve` — two-panel layout visible with placeholders | — |

**Completion gate**: Dashboard skeleton renders with the correct two-panel layout, placeholder text visible in each section, Cancel/Save buttons positioned bottom-right.

**Note**: The demo page (`app.component.html`) currently shows the AppDropdown demo. Phase 2.5 replaces it with the dashboard skeleton. The dropdown demo can be restored on a separate route later if needed.

---

### Phase 3: Component Layer (Parallel leaves — up to 4 agents, then LeftPanel)

**Goal**: Build the four leaf components (TopBar, CmdFormPanel, OperationsFormList, StatusGrid) in parallel where possible, then add `LeftPanelComponent` as the composer that imports the two CVA form modules and owns the reactive `FormGroup` for CMD + OPERATIONS.

#### Agent A: TopBarModule

| # | Task | Files |
|---|------|-------|
| 2A.1 | Create `TopBarModule` importing `AppDropdownModule` | `src/app/components/config-dashboard/components/top-bar/top-bar.module.ts` |
| 2A.2 | Implement `TopBarComponent` (dumb) with `@Input() selectedAction`, `@Output() actionChanged`, `@Output() resetClicked` | `src/app/components/config-dashboard/components/top-bar/top-bar.component.ts` |
| 2A.3 | Create template: "Sys:" label + AppDropdown for action + "Reset" button | `src/app/components/config-dashboard/components/top-bar/top-bar.component.html` |
| 2A.4 | Style: full-width bar, flex layout, dark theme colors | `src/app/components/config-dashboard/components/top-bar/top-bar.component.scss` |
| 2A.5 | Unit tests: emits actionChanged on dropdown change, emits resetClicked on Reset click | `src/app/components/config-dashboard/components/top-bar/top-bar.component.spec.ts` |

#### Agent B: CmdFormPanelModule

**Files touched**: `src/app/components/config-dashboard/components/cmd-form-panel/*` only

**Post-task cleanup**: After creating `cmd-form-panel.models.ts` with the canonical `CommandPair`, update `config-dashboard/models/dashboard-form.models.ts` to import `CommandPair` from `../components/cmd-form-panel/cmd-form-panel.models` and remove the temporary local definition.

| # | Task | Files |
|---|------|-------|
| 2B.1 | Define `CommandPair` interface (co-located with the component) | `src/app/components/config-dashboard/components/cmd-form-panel/cmd-form-panel.models.ts` |
| 2B.2 | Create `CmdFormPanelModule` importing `AppDropdownModule`, `ReactiveFormsModule` | `src/app/components/config-dashboard/components/cmd-form-panel/cmd-form-panel.module.ts` |
| 2B.3 | Implement `CmdFormPanelComponent` with CVA emitting `CommandPair` | `src/app/components/config-dashboard/components/cmd-form-panel/cmd-form-panel.component.ts` |
| 2B.4 | Create template: "CMD" label + two AppDropdowns side by side | `src/app/components/config-dashboard/components/cmd-form-panel/cmd-form-panel.component.html` |
| 2B.5 | Style: section header, horizontal layout for dropdowns | `src/app/components/config-dashboard/components/cmd-form-panel/cmd-form-panel.component.scss` |
| 2B.6 | Unit tests: CVA contract (writeValue sets both dropdowns, onChange emits combined object) | `src/app/components/config-dashboard/components/cmd-form-panel/cmd-form-panel.component.spec.ts` |

#### Agent C: OperationsFormListModule

| # | Task | Files |
|---|------|-------|
| 2C.1 | Create `OperationsFormListModule` importing `AppDropdownModule`, `ReactiveFormsModule` | `src/app/components/config-dashboard/components/operations-form-list/operations-form-list.module.ts` |
| 2C.2 | Implement `OperationsFormListComponent` with CVA emitting `string[]` (10 values) | `src/app/components/config-dashboard/components/operations-form-list/operations-form-list.component.ts` |
| 2C.3 | Create template: "OPERATIONS" header + 10 rows with label + AppDropdown each | `src/app/components/config-dashboard/components/operations-form-list/operations-form-list.component.html` |
| 2C.4 | Style: vertical list, label-dropdown row layout, spacing | `src/app/components/config-dashboard/components/operations-form-list/operations-form-list.component.scss` |
| 2C.5 | Unit tests: CVA with array value, individual dropdown changes update the correct index | `src/app/components/config-dashboard/components/operations-form-list/operations-form-list.component.spec.ts` |

#### Agent D: StatusGridModule

| # | Task | Files |
|---|------|-------|
| 2D.1 | Create `StatusGridModule` (no special imports beyond CommonModule) | `src/app/components/config-dashboard/components/status-grid/status-grid.module.ts` |
| 2D.2 | Implement `StatusGridComponent` (dumb) with `@Input() gridConfig: GridConfig`, `@Input() gridRows: GridRow[]` | `src/app/components/config-dashboard/components/status-grid/status-grid.component.ts` |
| 2D.3 | Create template: per row — label+value as plain text (outside grid), status cells in a bordered grid (no headers, no row labels). Label+value horizontally aligned with their grid row | `src/app/components/config-dashboard/components/status-grid/status-grid.component.html` |
| 2D.4 | Style: bordered grid cells, bright indicators on dark background, colored dots for color-type columns, text labels for text-type columns. Label+value outside grid with flex alignment | `src/app/components/config-dashboard/components/status-grid/status-grid.component.scss` |
| 2D.5 | Unit tests: renders correct number of rows/columns, displays provided grid data, label+value rendered outside grid structure | `src/app/components/config-dashboard/components/status-grid/status-grid.component.spec.ts` |

#### Agent E: LeftPanelModule (sequential after 3B + 3C)

**Files touched**: `src/app/components/config-dashboard/components/left-panel/*` only

**Prerequisites**: `CmdFormPanelModule` and `OperationsFormListModule` exist (Phase 3B + 3C).

| # | Task | Files |
|---|------|-------|
| 2E.1 | Create `LeftPanelModule` importing `CmdFormPanelModule`, `OperationsFormListModule`, `ReactiveFormsModule`, `CommonModule` | `src/app/components/config-dashboard/components/left-panel/left-panel.module.ts` |
| 2E.2 | Implement `LeftPanelComponent`: build `FormGroup` with `commands` + `operations`; `@Input() cmdOptions`, `@Input() operationOptions`, `@Input() formValue`; `@Output() formChanged`, `@Output() saved`, `@Output() cancelled` | `src/app/components/config-dashboard/components/left-panel/left-panel.component.ts` |
| 2E.3 | Template: `<app-cmd-form-panel formControlName="commands" …>`, `<app-operations-form-list formControlName="operations" …>`, Save/Cancel buttons | `src/app/components/config-dashboard/components/left-panel/left-panel.component.html` |
| 2E.4 | Style: CMD + OPERATIONS card layout (matches spec separators / footer alignment) | `src/app/components/config-dashboard/components/left-panel/left-panel.component.scss` |
| 2E.5 | Unit tests: emits `formChanged` on value changes; `saved` / `cancelled` on button clicks; applies `formValue` input via `patchValue` / reset pattern | `src/app/components/config-dashboard/components/left-panel/left-panel.component.spec.ts` |

**Completion gate**: All five deliverables (TopBar, CmdFormPanel, OperationsFormList, StatusGrid, LeftPanel) build in isolation; all unit tests pass.

---

### Phase 4: Dashboard Wiring (Sequential — 1 agent)

**Goal**: Replace skeleton placeholders with real child components. Keep `ConfigDashboardComponent` a layout orchestrator: **no** `FormGroup`, **no** `ReactiveFormsModule` on `ConfigDashboardModule`. Wire `LeftPanelModule` for the left side; compose TopBar + StatusGrid + services.

**Prerequisites**: Phase 2 (skeleton) and Phase 3 (all child components, including LeftPanel) complete.

| # | Task | Files |
|---|------|-------|
| 4.1 | Update `ConfigDashboardModule` to import `TopBarModule`, `LeftPanelModule`, `StatusGridModule` only (do **not** import `CmdFormPanelModule`, `OperationsFormListModule`, or `ReactiveFormsModule` here) | `src/app/components/config-dashboard/config-dashboard.module.ts` |
| 4.2 | In `ConfigDashboardComponent`, hold action selection state + service injection (`DashboardFormService`, `StatusGridService`). Pass `cmdOptions` / `operationOptions` / `formValue` into `<app-left-panel>`; handle `(formChanged)`, `(saved)`, `(cancelled)` | `src/app/components/config-dashboard/config-dashboard.component.ts` |
| 4.3 | Replace placeholder content: `<app-top-bar>`, `<app-left-panel [cmdOptions]="…" [operationOptions]="…" [formValue]="…" (formChanged)="…" (saved)="…" (cancelled)="…">`, `<app-status-grid [gridConfig]="gridConfig" [gridRows]="gridRows$ \| async">` | `src/app/components/config-dashboard/config-dashboard.component.html` |
| 4.4 | **Save**: On `(saved)`, take emitted `DashboardFormValue` slice (commands + operations) + current action → call `formService.saveConfig(...)`; update saved baseline; optional: push updated `formValue` back to left panel for pristine sync | `src/app/components/config-dashboard/config-dashboard.component.ts` |
| 4.5 | **Cancel**: On `(cancelled)`, restore service baseline and set `formValue` `@Input` so `LeftPanelComponent` realigns its `FormGroup` (e.g. `patchValue` from parent) | `src/app/components/config-dashboard/config-dashboard.component.ts` |
| 4.6 | **Reset**: On top-bar `(resetClicked)`, call `formService.resetToDefaults()` + `gridService.resetToDefaults()`; refresh `formValue` passed to the left panel and reset action dropdown state | `src/app/components/config-dashboard/config-dashboard.component.ts` |
| 4.7 | Wire services: on `(formChanged)` or subscription to emitted values → `formService.updateFormState()`. Expose `gridService.gridRows$` to StatusGrid. On init: `gridService.connect()` | `src/app/components/config-dashboard/config-dashboard.component.ts` |
| 4.8 | Wire TopBar: pass action value and options, handle `(actionChanged)` and `(resetClicked)` | `src/app/components/config-dashboard/config-dashboard.component.html` |
| 4.9 | Integration tests: full flow (change values → save → cancel → reset) with left panel as FormGroup owner | `src/app/components/config-dashboard/config-dashboard.component.spec.ts` |

**Completion gate**: Full dashboard renders with real components, all form interactions work (save/cancel/reset), grid reflects state changes.

---

### Phase 5: Polish & Verify (Sequential — 1 agent)

| # | Task |
|---|------|
| 5.1 | Visual QA against Stitch design — compare spacing, colors, typography |
| 5.2 | Fine-tune theme SCSS tokens if needed |
| 5.3 | Verify all unit tests pass (`ng test --watch=false`) |
| 5.4 | Verify `ng build --configuration production` succeeds |
| 5.5 | Clean up any unused Angular CLI boilerplate files |

---

## Parallel Execution Summary

```
┌─────────┬──────────────────────────────────────────────────────────┐
│  Phase  │  Agents    │  Tasks (parallel streams)                   │
├─────────┼────────────┼────────────────────────────────────────────┤
│  0      │  1 agent   │  Project scaffold (sequential)             │
│  1      │  3 agents  │  A: AppDropdown │ B: Service+Models │ C: Theme │
│  2      │  1 agent   │  Dashboard skeleton (sequential)           │
│  3      │  4+1       │  A–D parallel; E: LeftPanel after B+C       │
│  4      │  1 agent   │  Dashboard wiring (sequential)             │
│  5      │  1 agent   │  Polish & verify (sequential)              │
├─────────┼────────────┼────────────────────────────────────────────┤
│  TOTAL  │  Max 4     │  ~12 agent sessions across 6 phases        │
└─────────┴────────────┴────────────────────────────────────────────┘
```

### Dependency Graph (what blocks what)

```
Phase 0 ──► Phase 1A (AppDropdown)
Phase 0 ──► Phase 1B (Service + Models)  ◄── independent of 1A
Phase 0 ──► Phase 1C (Theme)             ◄── independent of 1A, 1B

Phase 1  ──► Phase 2 (Dashboard Skeleton) ◄── needs theme + service models

Phase 1A ──► Phase 3A (TopBar)           ◄── needs AppDropdown
Phase 1A ──► Phase 3B (CmdFormPanel)         ◄── needs AppDropdown
Phase 1A ──► Phase 3C (OperationsFormList)   ◄── needs AppDropdown
Phase 1B ──► Phase 3D (StatusGrid)       ◄── needs GridData model

Phase 3B ──► Phase 3E (LeftPanel)        ◄── imports CmdFormPanelModule
Phase 3C ──► Phase 3E (LeftPanel)        ◄── imports OperationsFormListModule

Phase 2  ──► Phase 4 (Dashboard Wiring)
Phase 3A ──► Phase 4
Phase 3D ──► Phase 4
Phase 3E ──► Phase 4                     ◄── dashboard imports LeftPanelModule only

Phase 4  ──► Phase 5 (Polish)
```

### Agent Assignment Rules

1. **No two agents edit the same file** — co-location and module-per-component structure guarantees file isolation
2. **Component-specific models** are created by each component's own agent (e.g., Agent A creates `DropdownOption`, Phase 3 Agent B creates `CommandPair`)
3. **Dashboard-shared models/services** (`config-dashboard/models/`, `config-dashboard/services/`) are created by Phase 1 Agent B and only read by Phase 2/3 agents
4. **Project-level mocks** (`app/mocks/`) are created by Phase 1 Agent B and only read at integration time
5. **AppModule** (`app.module.ts`) is only touched in Phase 3 — no conflicts
6. **`styles.scss`** is only touched by Agent C in Phase 1 — no conflicts
7. **Each agent receives**: the spec, the specific task list for their component, and the co-located models they need
8. **No inline templates or styles** — every component must use `templateUrl` and `styleUrls` pointing to dedicated `.html` and `.scss` files

---

## File Manifest

```
src/
├── index.html                              ← Phase 0 (+ Google Fonts)
├── styles.scss                             ← Phase 1C (theme)
├── styles/
│   └── _variables.scss                     ← Phase 1C (SCSS vars)
├── app/
│   ├── app.module.ts                       ← Phase 3 (import dashboard)
│   ├── app.component.html                  ← Phase 3 (place dashboard)
│   ├── app.component.ts                    ← Phase 0 (generated)
│   ├── mocks/                              ← project-level mock data
│   │   └── mock-data.ts                    ← Phase 1B (ACTIONS, CMD_OPTIONS, etc.)
│   └── components/
│       ├── app-dropdown/                   ← Phase 1A (portable, generic)
│       │   ├── app-dropdown.models.ts      ← DropdownOption interface
│       │   ├── app-dropdown.module.ts
│       │   ├── app-dropdown.component.ts
│       │   ├── app-dropdown.component.html
│       │   ├── app-dropdown.component.scss
│       │   └── app-dropdown.component.spec.ts
│       └── config-dashboard/               ← Phase 2 skeleton + Phase 4 wiring (PORTABLE: self-contained)
│           ├── models/
│           │   ├── grid.models.ts          ← GridCell, GridRow, GridColumn, GridConfig, FieldUpdate
│           │   ├── dashboard-form.models.ts ← DashboardFormValue
│           │   └── dashboard-defaults.ts   ← DEFAULT_FORM_VALUE, buildInitialGridRows()
│           ├── services/
│           │   ├── dashboard-form.service.ts    ← DashboardFormService (left panel)
│           │   ├── dashboard-form.service.spec.ts
│           │   ├── status-grid.service.ts       ← StatusGridService (right panel)
│           │   └── status-grid.service.spec.ts
│           ├── components/
│           │   ├── top-bar/                ← Phase 3A
│           │   │   ├── top-bar.module.ts
│           │   │   ├── top-bar.component.ts
│           │   │   ├── top-bar.component.html
│           │   │   ├── top-bar.component.scss
│           │   │   └── top-bar.component.spec.ts
│           │   ├── cmd-form-panel/         ← Phase 3B
│           │   │   ├── cmd-form-panel.models.ts  ← CommandPair interface
│           │   │   ├── cmd-form-panel.module.ts
│           │   │   ├── cmd-form-panel.component.ts
│           │   │   ├── cmd-form-panel.component.html
│           │   │   ├── cmd-form-panel.component.scss
│           │   │   └── cmd-form-panel.component.spec.ts
│           │   ├── operations-form-list/ ← Phase 3C
│           │   │   ├── operations-form-list.module.ts
│           │   │   ├── operations-form-list.component.ts
│           │   │   ├── operations-form-list.component.html
│           │   │   ├── operations-form-list.component.scss
│           │   │   └── operations-form-list.component.spec.ts
│           │   ├── left-panel/             ← Phase 3E (composer)
│           │   │   ├── left-panel.module.ts
│           │   │   ├── left-panel.component.ts
│           │   │   ├── left-panel.component.html
│           │   │   ├── left-panel.component.scss
│           │   │   └── left-panel.component.spec.ts
│           │   └── status-grid/            ← Phase 3D
│           │       ├── status-grid.module.ts
│           │       ├── status-grid.component.ts
│           │       ├── status-grid.component.html
│           │       ├── status-grid.component.scss
│           │       └── status-grid.component.spec.ts
│           ├── config-dashboard.module.ts
│           ├── config-dashboard.component.ts
│           ├── config-dashboard.component.html
│           ├── config-dashboard.component.scss
│           └── config-dashboard.component.spec.ts
```

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Node.js version incompatible with Angular 13 | Low | High | Verify with `node -v` before Phase 0; use `fnm` or `nvm` to switch |
| Angular Material 13 `ng add` prompts block non-interactive mode | Medium | Low | Use `--defaults` flag or pre-configure `angular.json` |
| CVA nesting (AppDropdown inside CmdFormPanel/OperationsFormList) causes value propagation issues | Medium | Medium | Phase 1A tests verify CVA in isolation; Phase 3E tests verify nested CVA inside LeftPanel `FormGroup` |
| Merge conflicts from parallel agents | Low | Low | Module-per-component guarantees file isolation; shared files only touched in designated phases |
| Custom theme colors don't match Stitch design exactly | Medium | Low | Phase 4 visual QA catches discrepancies; iterate on SCSS variables |
