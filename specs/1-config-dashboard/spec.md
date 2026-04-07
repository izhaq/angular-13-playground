# Feature Specification: Configuration Dashboard

**Feature ID**: 1-config-dashboard
**Created**: 2026-04-02
**Status**: Draft
**Branch**: `1-config-dashboard`

---

## 1. Feature Overview

### Summary

A configuration dashboard that allows users to manage system operations through a two-panel interface. The left panel provides command selection and operation configuration via dropdowns, while the right panel displays a status matrix/grid showing the state of each operation across multiple categories. Users can configure up to 10 actions, assign options to each, and view their status in a color-coded grid.

### Problem Statement

Users need a centralized interface to configure system operations (actions) and immediately see their status across multiple dimensions (categories represented by colored indicators and labeled columns). Currently, there is no visual tool to manage these configurations in one place.

### Target Users

- System administrators who configure and monitor operational actions
- Power users who need to quickly adjust operation parameters and verify status

### Business Value

- Reduces configuration time by consolidating command selection, operation assignment, and status visibility into a single screen
- Provides immediate visual feedback on operation states through a color-coded matrix
- Minimizes errors by offering constrained dropdown selections rather than free-form input

---

## Clarifications

### Session 2026-04-02

- Q: How should the UI be decomposed into Angular components? → A: Parent layout container + 3 direct children (`TopBarComponent`, `LeftPanelComponent`, `StatusGridComponent`). `LeftPanelComponent` composes `CmdFormPanelComponent` and `OperationsFormListComponent` (CMD + OPERATIONS card, footer Save/Cancel) + a generic reusable `AppDropdownComponent` wrapping Angular Material's `mat-select`.
- Q: How should child components communicate? → A: `@Input`/`@Output` for direct parent-child communication (favor dumb/presentational components). Shared state service (BehaviorSubjects) for sibling-to-sibling communication.
- Q: Which components implement ControlValueAccessor? → A: `AppDropdownComponent` (single value), `OperationsFormListComponent` (emits array of 10 selections), and `CmdFormPanelComponent` (emits command pair). All three are CVA-enabled form controls.
- Q: Which Angular forms approach? → A: Reactive Forms. `LeftPanelComponent` owns the `FormGroup` for `commands` (CmdFormPanel CVA) and `operations` (OperationsFormList CVA). `ConfigDashboardComponent` does not declare a `FormGroup` or import `ReactiveFormsModule`; it passes option lists and `formValue` into the left panel and reacts to `formChanged`, `saved`, and `cancelled`. Top-bar action selection remains presentational (`@Input` / `@Output`) at the dashboard level. Save snapshots flow through outputs + `DashboardFormService`; Cancel restores baseline; Reset (top bar) resets defaults via orchestration.
- Q: How does the status grid get its data? → A: Derived mock data for now (computed from current form state). Architecture must support future Node.js backend with: (1) REST endpoint for form submission, (2) WebSocket connection for live grid updates. Service layer should abstract the data source for easy swap.
- Addendum: Each component must live in its own NgModule (module-per-component pattern) to make the future migration to Angular 14+ standalone components as simple as possible.
- Addendum: Models and services are co-located with their corresponding components. Shared ones live at the closest common parent. Project-level `mocks/` holds mock data/APIs, while dashboard-specific code is self-contained under `config-dashboard/` for easy portability to other projects.
- Addendum: Every component must have a dedicated external template (`.html`) and external stylesheet (`.scss`). No inline templates or inline styles — always use `templateUrl` and `styleUrls` in the `@Component` decorator.

---

## 2. Project Setup Requirements

### Angular 13 Project Scaffold

Before building the dashboard component, the project must be initialized as an Angular 13 application with Angular Material 13:

- **Angular version**: Exactly version 13 (not 14, not 12)
- **Angular Material version**: Exactly version 13 (matching the Angular version)
- **Package manager**: npm
- The project root is `/Users/yizhaq.baroz/IdeaProjects/angular-13-playground`

### Assumptions (Project Setup)

- TypeScript version compatible with Angular 13 will be used (~4.4.x or ~4.5.x)
- Node.js version compatible with Angular 13 (v14.x or v16.x) is available on the dev machine
- A default Angular Material theme (e.g., a dark/custom theme matching the design) will be configured
- The project will use NgModule-based architecture (Angular 13 does not support standalone components)

---

## 3. Functional Requirements

### FR-1: Top Navigation Bar

- **FR-1.1**: The "Action" label and its dropdown are displayed on the **left** side of the top bar
- **FR-1.2**: A "Reset" button is displayed on the **right** side of the top bar
- **FR-1.3**: Clicking "Reset" restores all dropdowns to their default/initial values and clears any grid state changes

### FR-2: Command Selection Panel (Left Panel - CMD Section)

- **FR-2.1**: A "CMD" label is displayed to the **left** of the command dropdowns (inline, not above)
- **FR-2.2**: Two command dropdowns ("cmd 1" and "cmd 2") are displayed to the right of the CMD label
- **FR-2.3**: Each command dropdown contains a list of selectable command options
- **FR-2.4**: Selecting a command may influence the available options in the Operations section below

### FR-3: Operations List (Left Panel - OPERATIONS Section)

- **FR-3.1**: An "OPERATIONS" (or "OPR") label is displayed **above** the operations rows as a section heading
- **FR-3.2**: The section contains exactly 10 rows, labeled "act 1" through "act 10"
- **FR-3.3**: Each action row has a label on the left and a dropdown on the right
- **FR-3.4**: Each dropdown allows the user to select from a list of operation options (e.g., "Option 1", "Option 2", etc.)
- **FR-3.5**: All dropdowns default to "Option 1" on initial load
- **FR-3.6**: CMD and OPERATIONS share a single visual card, separated by a horizontal line

### FR-4: Right Panel — Confirmed State + Status Grid

The right panel shows the **confirmed server state**, not the live form state from the left panel. It updates only via WebSocket messages (after a successful save).

#### Layout

- **FR-4.1**: The right panel has two visual regions per row: a **label + confirmed value** text area on the left, and a **status grid** on the right. The label+value text is **not part of the grid** — it is plain text sitting outside the grid structure
- **FR-4.2**: Each label+value pair is **horizontally aligned** with its corresponding grid row, so they read as one logical line
- **FR-4.3**: The status grid is a **full grid** (visible cell borders, aligned columns across all rows) with **no column headers** and **no row labels** inside it — only status indicator cells
- **FR-4.4**: The grid columns (currently: red, yellow, green, N, P, L) are configuration-driven and implied by their visual indicators
- **FR-4.5**: Each status cell is either active (showing its indicator — colored dot or text label) or inactive (empty)

#### Data Flow

- **FR-4.6**: On initial load, the right panel mirrors the default form values from the left panel (all fields show their default selections with empty statuses)
- **FR-4.7**: When the user changes a value on the left panel, the right panel does **not** update immediately
- **FR-4.8**: When the user clicks "Save", a POST API call is made (currently mocked). The right panel still does not update from the save response
- **FR-4.9**: A WebSocket connection runs in parallel. When the server confirms a change, it sends a message that updates the right panel — setting the confirmed value and/or status indicators for the affected row(s)
- **FR-4.10**: WebSocket messages support three update shapes flexibly:
  - **Full row update**: field + new value + all statuses replaced
  - **Value-only update**: field + new value (statuses unchanged)
  - **Single cell update**: field + specific status column toggled on/off

### FR-5: Save and Cancel Actions

- **FR-5.1**: A "Cancel" button is displayed at the bottom-right of the **left panel**
- **FR-5.2**: A "Save" button is displayed next to the Cancel button in the left panel
- **FR-5.3**: Clicking "Save" persists the current configuration (selected commands and operation options)
- **FR-5.4**: Clicking "Cancel" discards unsaved changes and reverts to the last saved state
- **FR-5.5**: The "Save" button is visually prominent (filled/primary style) compared to the "Cancel" button (outlined/secondary style)

### FR-6: Layout and Responsiveness

- **FR-6.1**: The dashboard uses a two-panel side-by-side layout on desktop viewports
- **FR-6.2**: The left and right panels resize proportionally with the viewport — no fixed widths
- **FR-6.3**: The entire screen uses a dark theme with dark backgrounds and light text
- **FR-6.4**: A horizontal separator line sits below the top bar, separating it from the content panels
- **FR-6.5**: A vertical separator line sits between the left and right panels
- **FR-6.6**: CMD and OPERATIONS share a single visual section in the left panel, separated by a horizontal line
- **FR-6.7**: All elements (panels, text, inputs, buttons) scale fluidly — no fixed widths, heights, or font sizes that would prevent resizing
- **FR-6.8**: No layout shift at any reasonable desktop viewport size

---

## 4. User Scenarios & Acceptance Criteria

### Scenario 1: Initial Load

**Given** a user opens the Configuration Dashboard
**When** the page finishes loading
**Then**:
- The top bar shows the Action dropdown (left) and Reset button (right)
- The CMD section shows two command dropdowns to the right of the "CMD" label
- The OPERATIONS section shows 10 rows (act 1 – act 10), all set to "Option 1"
- The right panel mirrors the defaults: each row shows the label, the default value, and empty status indicators
- The Cancel and Save buttons are visible at the bottom-right of the left panel

### Scenario 2: Configuring Operations (Left Panel Only)

**Given** the dashboard is loaded with default values
**When** the user changes "act 3" dropdown from "Option 1" to "Option 2"
**Then**:
- The dropdown for "act 3" on the **left** panel now displays "Option 2"
- The right panel does **not** change — it still shows the last confirmed state
- The form is now dirty; the Save button remains available

### Scenario 3: Saving Configuration → WebSocket Update

**Given** the user has modified one or more operation dropdowns
**When** the user clicks the "Save" button
**Then**:
- A mock POST API call sends the form state to the server
- The left panel form marks itself as pristine; the saved baseline updates
- The right panel does **not** update from the POST response
- Shortly after, the server pushes one or more WebSocket messages
- Each WebSocket message updates its target row on the right panel: setting the new confirmed value and/or toggling status indicators
- Example: a message `{ field: "operations.2", value: "Option 2", statuses: { red: true, green: false } }` updates act 3's confirmed value to "Option 2" and toggles the red and green cells

### Scenario 4: Canceling Changes

**Given** the user has modified operation dropdowns but has not saved
**When** the user clicks "Cancel"
**Then**:
- All left panel dropdowns revert to their last saved values
- The right panel remains unchanged (it already reflects the last confirmed state)

### Scenario 5: Resetting to Defaults

**Given** the user has made and possibly saved changes
**When** the user clicks "Reset" in the top bar
**Then**:
- All command dropdowns return to default values
- All operation dropdowns return to "Option 1"
- The right panel resets to show defaults with empty statuses

### Scenario 6: Partial WebSocket Update (Single Cell)

**Given** the right panel is showing confirmed state
**When** the server sends a WebSocket message updating only a single status column for a field (e.g. `{ field: "operations.4", statuses: { p: true } }`)
**Then**:
- Only the "P" cell on the "act 5" row toggles to active
- The confirmed value and all other status cells on that row remain unchanged

---

## 5. Technical Design

### Component Hierarchy

```
AppModule
│
└── AppComponent (root)
    │
    └── ConfigDashboardComponent (layout orchestrator — no FormGroup, no ReactiveFormsModule)
        │
        ├── TopBarComponent (dumb)
        │   │  @Input:  selectedAction
        │   │  @Output: actionChanged, resetClicked
        │   │
        │   └── AppDropdownComponent (CVA) ← action selector
        │
        ├── LeftPanelComponent (smart — owns FormGroup for commands + operations)
        │   │  @Input:  cmdOptions, operationOptions, formValue
        │   │  @Output: formChanged, saved, cancelled
        │   │
        │   ├── FormGroup { commands, operations }
        │   │
        │   ├── CmdFormPanelComponent (CVA — emits {cmd1, cmd2})
        │   │   formControlName="commands"
        │   │   ├── AppDropdownComponent (CVA) ← cmd 1
        │   │   └── AppDropdownComponent (CVA) ← cmd 2
        │   │
        │   ├── OperationsFormListComponent (CVA — emits string[10])
        │   │   formControlName="operations"
        │   │   ├── AppDropdownComponent (CVA) ← act 1
        │   │   ├── AppDropdownComponent (CVA) ← act 2
        │   │   ├── AppDropdownComponent (CVA) ← act 3
        │   │   ├── AppDropdownComponent (CVA) ← act 4
        │   │   ├── AppDropdownComponent (CVA) ← act 5
        │   │   ├── AppDropdownComponent (CVA) ← act 6
        │   │   ├── AppDropdownComponent (CVA) ← act 7
        │   │   ├── AppDropdownComponent (CVA) ← act 8
        │   │   ├── AppDropdownComponent (CVA) ← act 9
        │   │   └── AppDropdownComponent (CVA) ← act 10
        │   │
        │   └── [Footer buttons]
        │       ├── Cancel → emits cancelled (dashboard restores baseline / syncs service)
        │       └── Save   → emits saved (dashboard POST → WebSocket updates right panel)
        │
        └── StatusGridComponent (dumb — display only, right panel)
            │  @Input: gridConfig (GridConfig — column definitions)
            │  @Input: gridRows  (GridRow[] — confirmed values + statuses)
            │
            └── Per row: label+value as plain text (outside grid),
                status cells in a bordered grid (no headers, no row labels)
```

### Data Flow

The left and right panels are **independently driven**. The left panel is form-state-driven; the right panel is WebSocket-driven.

```
┌──────────────────────────────────────────────────────────────────┐
│              ConfigDashboardComponent                            │
│                                                                  │
│  LEFT PANEL (live form state)          RIGHT PANEL (confirmed)   │
│  ┌────────────────────────┐            ┌──────────────────────┐  │
│  │ LeftPanelComponent     │            │ StatusGridComponent   │  │
│  │ FormGroup {            │            │   @Input: gridConfig  │  │
│  │   commands:   {c1,c2}  │            │   @Input: gridRows    │  │
│  │   operations: str[10]  │            │                       │  │
│  │ }                      │            │ Each row shows:       │  │
│  └────────┬───────────────┘            │  label | value | ··· │  │
│           │ saved output               └──────────▲───────────┘  │
│           ▼                                       │              │
│  ┌────────────────────┐                           │              │
│  │ POST /api/config   │    server processes       │              │
│  │ (mock API service) │ ─────────────────────►    │              │
│  └────────────────────┘    WebSocket push         │              │
│                            ┌──────────────────┐   │              │
│                            │ FieldUpdate msg  │───┘              │
│                            │ { field, value?, │                  │
│                            │   statuses? }    │                  │
│                            └──────────────────┘                  │
│                                                                  │
│  DashboardFormService (left panel)                                │
│  ┌──────────────────────────────────────────────┐                │
│  │ formState$          ◄── BehaviorSubject       │                │
│  │ availableOptions$   ◄── derived from commands │                │
│  │ savedBaseline       ◄── last saved snapshot   │                │
│  │                                               │                │
│  │ saveConfig(form) ──► POST mock API            │                │
│  │ cancelChanges()  ──► restore savedBaseline    │                │
│  │ resetToDefaults() ─► reset to defaults        │                │
│  └──────────────────────────────────────────────┘                │
│                                                                  │
│  StatusGridService (right panel)                                 │
│  ┌──────────────────────────────────────────────┐                │
│  │ gridRows$           ◄── BehaviorSubject       │                │
│  │                                               │                │
│  │ applyUpdate(msg) ──► merge into gridRows$     │                │
│  │ connect() ─────────► WebSocket subscribe      │                │
│  │ resetToDefaults() ─► re-seed from defaults    │                │
│  └──────────────────────────────────────────────┘                │
│                                                                  │
│  On initial load: gridRows$ seeded from DEFAULT_FORM_VALUE       │
│  (each row gets the default confirmedValue, empty statuses)      │
└──────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Type | CVA | Module | Description |
|-----------|------|-----|--------|-------------|
| `ConfigDashboardComponent` | Layout orchestrator | No | `ConfigDashboardModule` | Two-panel shell + top bar wiring. No `FormGroup`; no `ReactiveFormsModule`. Binds `TopBarComponent`, `LeftPanelComponent`, `StatusGridComponent`. Injects `DashboardFormService` and `StatusGridService`; handles `saved` / `cancelled` / `formChanged` from the left panel |
| `LeftPanelComponent` | Smart/Container | No | `LeftPanelModule` | Owns the `FormGroup` for `commands` and `operations`. `@Input`: `cmdOptions`, `operationOptions`, `formValue`. `@Output`: `formChanged`, `saved`, `cancelled`. Template composes `CmdFormPanelComponent`, `OperationsFormListComponent`, and Save/Cancel footer |
| `TopBarComponent` | Dumb/Presentational | No | `TopBarModule` | Action dropdown (left) + Reset button (right). Emits events upward |
| `CmdFormPanelComponent` | Dumb + CVA | Yes | `CmdFormPanelModule` | Wraps two `AppDropdownComponent`s, exposes `{cmd1, cmd2}` as a single form control |
| `OperationsFormListComponent` | Dumb + CVA | Yes | `OperationsFormListModule` | Renders 10 operation rows, exposes `string[]` of 10 values as a single form control |
| `StatusGridComponent` | Dumb/Presentational | No | `StatusGridModule` | Receives `gridConfig` and `gridRows` via `@Input`. Per row: label+value as plain text outside the grid, status cells in a bordered grid (no headers). Read-only |
| `AppDropdownComponent` | Dumb/Presentational | No | `AppDropdownModule` | Generic wrapper around Angular Material `mat-select`. CVA provided by `AppDropdownCvaDirective` |

### Module-Per-Component Strategy

Each component lives in its own NgModule. This provides:

- **Encapsulation**: Each module declares and exports only its own component, importing only what it needs
- **Easy standalone migration**: When upgrading to Angular 14+, each module maps 1:1 to a standalone component — just add `standalone: true`, move imports into the component decorator, and delete the module file
- **Lazy-load ready**: Individual modules can be lazy-loaded if needed in the future

**Future extensibility**: Additional left-panel form sections (e.g., feature-flagged or role-based blocks) can be added inside `LeftPanelComponent`'s template using `*ngIf` / structural guards without growing `ConfigDashboardComponent`. The dashboard stays a thin layout shell while the left panel remains the single place that owns reactive form structure for CMD + OPERATIONS.

### External Template & Stylesheet Rule

Every component uses **external files** for template and styles — no inline:

- Use `templateUrl: './<name>.component.html'` (never `template:`)
- Use `styleUrls: ['./<name>.component.scss']` (never `styles:`)

This keeps each file focused, improves readability, and aligns with the module-per-component pattern where each component folder is a self-contained unit.

### Label Placement Patterns

Labels follow two distinct patterns depending on context:

- **Inline (left-side) labels**: The label sits to the **left** of its corresponding input, in a horizontal flex row (`.app-dropdown-wrapper`). Applies to:
  - TopBar: "Action" label inline with its dropdown
  - CmdFormPanel: "CMD" label inline with the two cmd dropdowns
  - OperationsFormList rows: "act 1"–"act 10" labels inline with their dropdowns
  - Global styles in `src/styles/_dropdowns.scss`
- **Section heading label**: The "OPR" / "OPERATIONS" label is displayed **above** the 10 operations rows as a section heading, not inline. It acts as a title for the form section below it.

### Styling Rules

These rules apply to **all components** in this project:

1. **No fixed dimensions**: No fixed `width`, `height`, or `font-size` in `px` that would prevent scaling. All layout elements must resize fluidly with the viewport. Use `flex`, `%`, `fr`, `auto`, `min-content`/`max-content` for layout sizing. Use relative units (`rem`, `em`) for font sizes and spacing where appropriate, or `px` from SCSS variables that can be changed in one place.
2. **No layout shift**: Elements must not jump, overflow, or cause scrollbars at any reasonable desktop viewport size. Use `flex-shrink`, `min-width: 0`, `overflow` strategies to handle content gracefully.
3. **SCSS nesting**: Use SCSS's nesting (`&`) to express parent-child relationships clearly. Avoid flat, disconnected class selectors. Structure SCSS to mirror the template's DOM hierarchy.
4. **Minimum boilerplate**: Keep templates, styles, and component code as lean as possible. No redundant wrappers, no unnecessary classes, no verbose selectors. Every line of code must earn its place.
5. **SCSS variables for theming**: All colors, spacing, typography, and border values must come from SCSS variables. Global tokens live in `src/styles/_variables.scss`. Component-specific values (e.g., separator opacity, panel proportions) are defined as local SCSS variables at the top of the component's `.scss` file. This makes the dashboard easy to re-theme when copied to another project.
6. **Portability-first styling**: Styles must be structured so that changing `_variables.scss` is sufficient to adapt the dashboard to a different project's design system. No hardcoded hex colors, font names, or magic numbers scattered through component styles.

### Co-Location & Portability Rules

Models, services, and related code follow these placement rules:

1. **Co-locate with component**: Models and services that serve a single component live in that component's folder (e.g., `cmd-form-panel/cmd-form-panel.models.ts`)
2. **Closest common parent**: Shared models/services bubble up only to the nearest ancestor that needs them (e.g., `DashboardFormService` and `StatusGridService` live under `config-dashboard/services/` because they're shared by all dashboard children)
3. **App-level = mocks/APIs only**: `src/app/mocks/` holds project-wide mock data. Future `src/app/services/` holds project-wide API clients. These are NOT dashboard-specific
4. **Dashboard is portable**: All dashboard-related code (models, services, child components) lives under `components/config-dashboard/` so the entire folder can be relocated to a different project

Module structure per component:

```
src/app/components/<component-name>/
├── <component-name>.component.ts
├── <component-name>.component.html
├── <component-name>.component.scss
├── <component-name>.component.spec.ts
├── <component-name>.module.ts
└── <component-name>.models.ts              (if component has its own models)
```

For container components with shared concerns (config-dashboard):

```
src/app/components/config-dashboard/
├── models/
│   ├── grid.models.ts                      (GridCell, GridRow, GridData, GridColumn, GridConfig, FieldUpdate)
│   ├── dashboard-form.models.ts            (DashboardFormValue)
│   └── dashboard-defaults.ts               (DEFAULT_FORM_VALUE)
├── services/
│   ├── dashboard-form.service.ts           (DashboardFormService — left panel)
│   ├── dashboard-form.service.spec.ts
│   ├── status-grid.service.ts              (StatusGridService — right panel)
│   └── status-grid.service.spec.ts
├── config-dashboard.module.ts
├── config-dashboard.component.ts
├── config-dashboard.component.html
├── config-dashboard.component.scss
└── config-dashboard.component.spec.ts
```

Import chain:

```
AppModule
└── imports: ConfigDashboardModule
    └── imports: TopBarModule, LeftPanelModule, StatusGridModule
        └── LeftPanelModule imports: CmdFormPanelModule, OperationsFormListModule, ReactiveFormsModule
            └── leaf modules import: AppDropdownModule (where needed)
                └── imports: MatSelectModule, ReactiveFormsModule (as needed for CVA hosts)
```

### Portability

The dashboard is designed to be self-contained and relocatable. For the full 8-step export guide — covering component folders, npm dependencies, SCSS variables, `angular.json` config, Material theme overrides, fonts, module wiring, and data provisioning — see **[portability-guide.md](../../portability-guide.md)**.

### Inter-Component Communication

- **Parent → Child**: `@Input` bindings for data (options, grid config, grid rows, selected values)
- **Child → Parent**: `@Output` EventEmitter for user actions (reset clicked, action changed, left panel `formChanged` / `saved` / `cancelled`)
- **CVA Components**: `CmdFormPanelComponent` and `OperationsFormListComponent` integrate with `LeftPanelComponent`'s `FormGroup` via `formControlName` / `formControl` directives
- **Sibling Communication**: Two dedicated services, each managing one panel:
  - `DashboardFormService`: form state, saved baseline, available options, save/cancel/reset logic
  - `StatusGridService`: confirmed grid rows, WebSocket subscription, `applyUpdate()` merge logic
- **Grid Data Flow**: `StatusGridService.gridRows$` is a `BehaviorSubject<GridRow[]>` seeded from defaults on initial load. Updates come exclusively from WebSocket `FieldUpdate` messages (after a save triggers the server). The left panel form state and right panel confirmed state are **independent** — they do not derive from each other after initial seed

### Form Architecture

- **Strategy**: Reactive Forms (`ReactiveFormsModule`) on `LeftPanelModule` only; `ConfigDashboardModule` does not import `ReactiveFormsModule`
- **Left panel `FormGroup` structure** (owned by `LeftPanelComponent`):
  - `commands`: FormControl (object `{cmd1, cmd2}` — via CmdFormPanel CVA)
  - `operations`: FormControl (string[] of 10 values — via OperationsFormList CVA)
- **Top bar action**: Not part of the left-panel `FormGroup`; bound with `@Input` / `@Output` on `TopBarComponent` from `ConfigDashboardComponent` (and synced with `DashboardFormService` as needed)
- **Save / Cancel**: `LeftPanelComponent` emits `saved` / `cancelled`; `ConfigDashboardComponent` coordinates `DashboardFormService` (baseline snapshot, `patchValue` / restore, POST)
- **Reset**: Top-bar reset orchestrated at dashboard level (defaults + service + optional `formValue` push into `LeftPanelComponent` to realign the nested form)

### Backend Integration (Mock → Real)

The service layer uses mocks now but is designed for a future Node.js backend:

- **REST endpoint**: `POST /api/config` — currently mocked in a service. Sends `DashboardFormValue` on save
- **WebSocket**: `ws://…/grid-updates` — currently mocked with simulated `FieldUpdate` messages. Drives all right-panel updates
- `DashboardFormService` abstracts the save API; `StatusGridService` abstracts the WebSocket connection. Swapping mocks for real backends requires changing only service internals, not components
- The `FieldUpdate` message format is designed to be server-friendly: the server can send value-only, status-only, or combined updates as needed

---

## 6. Key Entities

| Entity | Description |
|--------|-------------|
| System Action | A selectable action from the top bar dropdown |
| Command (CMD) | A command selection that may influence available operations |
| Operation (Act) | One of 10 configurable actions, each assigned an option via dropdown |
| Option | A selectable value for an operation (e.g., Option 1, Option 2) |
| Status Cell | An individual cell in the grid matrix representing a state for an action/category pair |
| Status Category | A column in the grid, identified by color (red/yellow/green) or label (N/P/L) |
| DashboardState | The combined form state: selected action, commands, and operations array |
| GridData | The derived 10×6 matrix of status values, computed from DashboardState |

---

## 6. Success Criteria

| # | Criterion | Measurement |
|---|-----------|-------------|
| SC-1 | Users can configure all 10 operations within 60 seconds | Task completion time |
| SC-2 | The dashboard loads and displays all elements within 3 seconds | Page load time |
| SC-3 | Users can save and retrieve configurations without data loss | Save/load verification |
| SC-4 | The status grid correctly reflects the current configuration state | Visual accuracy check |
| SC-5 | All dropdown selections persist correctly after save | Persistence verification |
| SC-6 | Reset returns all fields to default state with zero remaining custom values | Reset completeness |

---

## 7. Scope & Boundaries

### In Scope

- Angular 13 project setup with Angular Material 13
- Dark-themed configuration dashboard component
- Two-panel layout (configuration controls + status grid)
- Dropdown-based command and operation selection via reusable `AppDropdownComponent` (CVA)
- `CmdFormPanelComponent` and `OperationsFormListComponent` as CVA-enabled composite form controls (hosted under `LeftPanelComponent`)
- Reactive Forms architecture with `FormGroup` owned by `LeftPanelComponent`; `ConfigDashboardComponent` as layout orchestrator only
- `LeftPanelModule` composing CMD + OPERATIONS modules; `ConfigDashboardModule` imports `LeftPanelModule`
- Dumb/presentational child components with `@Input`/`@Output` where appropriate
- Module-per-component pattern (each component in its own NgModule for easy Angular 14+ standalone migration)
- Two dedicated services: `DashboardFormService` (left panel form state) and `StatusGridService` (right panel confirmed state via WebSocket)
- Status grid with configuration-driven columns and 10 rows (updated via WebSocket)
- Save, Cancel, and Reset functionality
- Desktop viewport layout
- Service layer abstraction to support future backend swap

### Out of Scope (Current Phase)

- Node.js backend server (planned for a future phase: REST endpoint for form submission + WebSocket for live grid updates)
- User authentication and authorization
- Mobile or tablet responsive layouts
- Multi-user collaboration or concurrent editing
- Internationalization (i18n)
- Automated testing setup (unit/e2e) beyond what Angular CLI generates by default

---

## 8. Dependencies & Assumptions

### Dependencies

- Node.js (v14.x or v16.x) installed on the development machine
- npm available as the package manager
- Angular CLI v13.x available (can be installed via npx)

### Assumptions

- The dashboard operates with derived mock data in this phase; a Node.js backend (REST + WebSocket) is planned for a future phase
- The 10 operations are fixed in count (always "act 1" through "act 10")
- Dropdown options are static and predefined
- The status grid is read-only for the user (derived from configuration state, not manually edited)
- The dark theme follows the design from the Stitch project (obsidian/charcoal palette)
- The colored indicators (red, yellow, green) and labels (N, P, L) represent fixed, predefined categories
- Angular 13 does not support standalone components; the project will use NgModule-based architecture with one module per component to ease future Angular 14+ standalone migration
- The `AppDropdownComponent` wraps Angular Material's `mat-select` and implements `ControlValueAccessor`

---

## 9. Visual Design Reference

### Design Source

**Stitch Project**: [Configuration Dashboard](https://stitch.withgoogle.com/projects/6143902989757124575)
- **Project ID**: `6143902989757124575`
- **Design System**: "The Obsidian Monolith" — dark-mode, editorial-style UI
- **Device Type**: Desktop (1280x1024)
- **Active Screen**: "Dashboard Without Status Section"

### Layout Description

The screen is a **dark-themed desktop dashboard** with a full-width top bar and two content panels below:

- **Top bar** spans the full width. On the left: an "Action" label and dropdown. On the right: a "Reset" text button. A horizontal separator line sits below the top bar.
- **Left panel** contains the configuration controls in a single visual card:
  - "CMD" label on the left (inline), two dropdowns ("cmd 1", "cmd 2") to the right of the label
  - A horizontal separator line between CMD and OPERATIONS
  - "OPR" label above the operations rows as a section heading
  - 10 rows of labeled dropdowns ("act 1" through "act 10")
  - Cancel + Save buttons at the bottom-right of the left panel
- **Right panel** shows the **confirmed server state**:
  - Each row has **label + confirmed value** as plain text on the left, horizontally aligned with a **status grid** on the right
  - The label+value text is **outside** the grid — not a grid column
  - The grid itself is a full bordered table (no headers, no row labels) containing only status indicator cells
  - On initial load, rows mirror the left panel defaults with empty statuses
  - Updates arrive only via WebSocket after a save operation
- A **vertical separator line** divides the left and right panels
- All elements are **fully responsive** — no fixed widths, heights, or font sizes. Everything scales with the viewport.

### Wireframe

```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│  Action  [Action ▾]                                                          Reset   │
├──────────────────────────────────────────────────────────────────────────────────────┤
│                            │                                                         │
│  CMD  [cmd 1 ▾] [cmd 2 ▾]  │                                                         │
│  ────────────────────────  │  act 1   Option 2     ┌────┬────┬────┬────┬────┬────┐   │
│                            │                       │ ●  │ ○  │ ○  │ ○  │ ●  │ ○  │   │
│  OPR                       │  act 2   Option 1     ├────┼────┼────┼────┼────┼────┤   │
│   act 1   [Option 1 ▾]     │                       │ ○  │ ○  │ ○  │ ○  │ ○  │ ○  │   │
│   act 2   [Option 1 ▾]     │  act 3   (empty)      ├────┼────┼────┼────┼────┼────┤   │
│   act 3   [Option 1 ▾]     │                       │ ○  │ ○  │ ○  │ ○  │ ○  │ ○  │   │
│   act 4   [Option 1 ▾]     │  act 4   Option 3     ├────┼────┼────┼────┼────┼────┤   │
│   act 5   [Option 1 ▾]     │                       │ ○  │ ●  │ ○  │ ○  │ ○  │ ●  │   │
│   act 6   [Option 1 ▾]     │  act 5   Option 1     ├────┼────┼────┼────┼────┼────┤   │
│   act 7   [Option 1 ▾]     │                       │ ○  │ ○  │ ○  │ ○  │ ○  │ ○  │   │
│   act 8   [Option 1 ▾]     │  act 6   Option 1     ├────┼────┼────┼────┼────┼────┤   │
│   act 9   [Option 1 ▾]     │                       │ ○  │ ○  │ ○  │ ○  │ ○  │ ○  │   │
│   act 10  [Option 1 ▾]     │  ...                  ├────┼────┼────┼────┼────┼────┤   │
│                            │                       │    │    │    │    │    │    │   │
│                            │  act 10  Option 1     ├────┼────┼────┼────┼────┼────┤   │
│                            │                       │ ○  │ ○  │ ○  │ ○  │ ○  │ ○  │   │
│                            │                       └────┴────┴────┴────┴────┴────┘   │
│       [Cancel]  [ Save ]   │                                                         │
│                            │  ● = active (colored dot / text label)                  │
│                            │  ○ = inactive (empty cell)                              │
│                            │  Grid columns defined by GridConfig (no headers)        │
│                            │  Label+value are outside grid, aligned per row          │
└────────────────────────────┴─────────────────────────────────────────────────────────┘
```

### Design Theme Details

| Property | Value |
|----------|-------|
| Color Mode | Dark |
| Background | `#0e0e0e` (near-black, not pure black) |
| Primary Text | `#e7e5e4` (warm white) |
| Secondary Text | `#acabaa` (muted gray) |
| Headline Font | Manrope |
| Body/Label Font | Inter |
| Corner Radius | 4px |
| Primary Color | `#c6c6c7` (silver) |
| Error Color | `#ee7d77` (coral red) |
| Tertiary/Accent | `#eff8ff` (bright white, used for status grid) |
| Depth Strategy | Tonal surface layering (no borders) |
