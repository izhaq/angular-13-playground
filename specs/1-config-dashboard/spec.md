# Feature Specification: Configuration Dashboard

**Feature ID**: 1-config-dashboard
**Created**: 2026-04-02
**Status**: Draft
**Branch**: `1-config-dashboard`

---

## 1. Feature Overview

### Summary

A configuration dashboard for a driving simulation system that allows users to control vehicle parameters through a two-panel interface. The left panel provides wheel selection (CMD panel) and vehicle control configuration (11 dropdowns) via dropdowns. The right panel displays a status grid where each column represents a specific wheel (derived from CMD panel selections: Left/Right × Wheels 1–4 = 8 columns), and each cell shows a 3-letter abbreviation of the selected value for that wheel+control combination. The grid supports additional custom columns for reuse across different dashboard screens.

### Problem Statement

Users need a centralized interface to configure vehicle simulation parameters per wheel and immediately see the applied configuration across all wheels in a status grid. Currently, there is no visual tool to manage these configurations in one place.

### Target Users

- Simulation engineers who configure and monitor vehicle parameters per wheel
- Test operators who need to quickly adjust simulation parameters and verify their application across wheels

### Business Value

- Reduces configuration time by consolidating wheel selection, vehicle control assignment, and per-wheel status visibility into a single screen
- Provides immediate visual feedback on per-wheel configuration through a text-based status grid
- Minimizes errors by offering constrained dropdown selections rather than free-form input

---

## Clarifications

### Session 2026-04-09 (Revision 2 — Major Requirements Update)

**CMD Panel:**
- Q: What are the CMD dropdowns? → A: Both are **multi-select**. First dropdown: car side (Left, Right). Second dropdown: wheel number (1, 2, 3, 4). Both default to first item selected.
- Q: What do CMD selections represent? → A: The user selects which wheels to apply configuration changes to. Each combination of side × wheel = one column in the grid.

**Operations List:**
- Q: How many dropdown rows should OperationsListComponent contain? → A: 11 dropdowns (expanded from 10)
- Q: What are the specific options per dropdown? → A:
  - Dropdown 1: 3 options — Not Active, Real, Captive
  - Dropdown 2: 2 options — No, Yes
  - Dropdown 3: label "Video rec", options — Internal, External
  - Dropdown 4: **multi-select**, label "Video Type", options — No, HD, 4K, 8K
  - Dropdown 5: 2 options — No, Yes
  - Dropdown 6: label "PWR On/Off", options — On, Off
  - Dropdown 7: label "Force", options — Normal, Force F, Force No
  - Dropdown 8: 2 options — No, Yes
  - Dropdown 9: 2 options — No, Yes
  - Dropdown 10: 2 options — No, Yes
  - Dropdown 11: 2 options — No, Yes
- Q: For multi-select dropdowns (Video Type), how should grid cells display multiple selections? → A: Comma-separated abbreviations (e.g., "HD,4K")

**Grid:**
- Q: How should grid cell abbreviations be defined? → A: Each dropdown option defines its own abbreviation in the config (e.g., `{ value: 'captive', label: 'Captive', abbr: 'CAP' }`)
- Q: What visual treatment for grid column hover and cell focus? → A: Hover: light background tint on entire column. Click: border + stronger background on the focused cell
- Q: How many status columns should the grid have? → A: Computed dynamically from CMD panel dropdown combinations (side × wheel = 8 base columns). Grid also supports additional custom columns injected by the consumer for reuse across dashboard screens.
- Q: How should the grid receive its configuration and data? → A: Two `@Input()`s on the grid component: `config` (GridConfig with row defs + column defs, renders the empty shell) and `rows` (RowViewModel[], starts empty, updated by WS via service). The parent dashboard owns both. Grid stays a pure presentational component.
- Q: How should grid column headers be labeled? → A: L1, L2, L3, L4, R1, R2, R3, R4 — representing Left wheels 1–4 and Right wheels 1–4.
- Q: What do grid cells display? → A: **No coloring.** Each cell shows a 3-letter abbreviation of the selected dropdown value for that wheel+row combination. Empty cells remain blank.
- Q: Should grid use `<table>` element? → A: Yes, a native `<table>` element for semantic correctness and simpler column hover behavior.

**Right Panel:**
- Q: Should the right panel show confirmed values next to labels? → A: **No** — show only labels (no values). The grid cells themselves convey the information via abbreviations.
- Q: Should the label list be extracted to a dedicated component? → A: Consider extracting to ensure alignment with grid rows remains clean.

**Top Bar:**
- Q: Where should the Default button be? → A: Move from top bar to **footer**, next to Cancel/Save buttons.
- Q: Does Default affect the right panel? → A: **No** — Default only resets the left panel to defaults. Right panel is unchanged.

**General:**
- Q: Should we add `data-testid` attributes? → A: Yes, for each dropdown and dropdown option — needed for Playwright tests in a later phase.
- Q: How should the POST payload represent CMD multi-select? → A: Payload includes `cmd: { sides: string[], wheels: string[] }` plus `operations: OperationsValue`. Server uses `sides × wheels` to determine affected grid columns.
- Q: How to handle confidential naming? → A: Feature uses temporary naming conventions. Code should support easy swap — consider a translation-like key-value dictionary for labels/text, switchable by config. For code identifiers (functions, variables, classes), document as a future consideration.

### Session 2026-04-02 (Original — partially superseded by Session 2026-04-09 Revision 2)

- Q: How should the UI be decomposed into Angular components? → A: Parent layout container + 3 direct children (`TopBarComponent`, `LeftPanelComponent`, `StatusGridComponent`). `LeftPanelComponent` composes `CmdPanelComponent` and `OperationsListComponent` (CMD + OPERATIONS card, footer Save/Cancel/Default) + generic reusable `AppDropdownComponent` and `AppMultiDropdownComponent`.
- Q: How should child components communicate? → A: `@Input`/`@Output` for direct parent-child communication (favor dumb/presentational components). Shared state service (BehaviorSubjects) for sibling-to-sibling communication.
- Q: ~~Which components implement ControlValueAccessor?~~ → **SUPERSEDED**: Dashboard components no longer use CVA. They use simple `@Input() value` / `@Output() changed` pattern. CVA remains on `AppDropdownComponent` via `AppDropdownCvaDirective` for optional form mode use.
- Q: ~~Which Angular forms approach?~~ → **SUPERSEDED**: No Reactive Forms on dashboard components. Simple `@Input`/`@Output` pattern throughout.
- Q: How does the status grid get its data? → A: Node.js backend with REST `POST /api/config` for save and WebSocket `/api/ws` for live grid updates.
- Addendum: Each component must live in its own NgModule (module-per-component pattern).
- Addendum: Models and services are co-located with their corresponding components. Shared ones live at the closest common parent.
- Addendum: Every component must have a dedicated external template (`.html`) and external stylesheet (`.scss`).

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

- **FR-1.1**: The "Scenario" label and its dropdown are displayed on the **left** side of the top bar
- **FR-1.2**: The top bar contains the Scenario dropdown only; the Default button has been moved to the footer (see FR-5)
- **FR-1.3**: When the "Realtime" scenario is selected, the entire left panel becomes disabled (visually dimmed)

### FR-2: Command Selection Panel (Left Panel - CMD Section)

- **FR-2.1**: A "CMD" label is displayed to the **left** of the command dropdowns (inline, not above)
- **FR-2.2**: Two **multi-select** command dropdowns are displayed to the right of the CMD label:
  - First dropdown ("Side"): options — Left, Right. Default: first item selected
  - Second dropdown ("Wheel"): options — 1, 2, 3, 4. Default: first item selected
- **FR-2.3**: The CMD selections define which wheels the user is configuring. Each combination of Side × Wheel corresponds to one column in the status grid (e.g., Left+1 = L1, Right+4 = R4)
- **FR-2.4**: The number of grid columns is dynamically computed from the CMD dropdown options (2 sides × 4 wheels = 8 base columns)

### FR-3: Operations List (Left Panel - OPERATIONS Section)

- **FR-3.1**: An "OPERATIONS" (or "OPR") label is displayed **above** the operations rows as a section heading
- **FR-3.2**: The section contains exactly **11 rows** with the following specific configurations:

| # | Label | Type | Options (abbr) | Default |
|---|-------|------|----------------|---------|
| 1 | TTM | Single | Not Active (N/A), Real (REA), Captive (CAP) | Not Active |
| 2 | Weather | Single | No (NO), Yes (YES) | No |
| 3 | Video rec | Single | Internal (INT), External (EXT) | Internal |
| 4 | Video Type | **Multi-select** | No (NO), HD (HD), 4K (4K), 8K (8K) | No |
| 5 | Headlights | Single | No (NO), Yes (YES) | No |
| 6 | PWR On/Off | Single | On (ON), Off (OFF) | On |
| 7 | Force | Single | Normal (NRM), Force F (FRC), Force No (FNO) | Normal |
| 8 | Stability | Single | No (NO), Yes (YES) | No |
| 9 | Cruise Ctrl | Single | No (NO), Yes (YES) | No |
| 10 | PLR | Single | No (NO), Yes (YES) | No |
| 11 | AUX | Single | No (NO), Yes (YES) | No |

- **FR-3.3**: Each action row has a label on the left and a dropdown on the right
- **FR-3.4**: Each dropdown option carries a `value`, `label`, and `abbr` (3-letter abbreviation displayed in grid cells)
- **FR-3.5**: All dropdowns default to their first option on initial load
- **FR-3.6**: CMD and OPERATIONS share a single visual card, separated by a horizontal line

### FR-4: Right Panel — Labels + Status Grid

The right panel shows the **confirmed server state**, not the live form state from the left panel. It updates only via WebSocket messages (after a successful save).

#### Layout

- **FR-4.1**: The right panel has two visual regions per row: a **label only** (no confirmed value) on the left, and the **status grid** on the right. The label is **not part of the grid** — it is plain text sitting outside the grid structure. Consider extracting the label list into a dedicated component for alignment purposes.
- **FR-4.2**: Each label is **horizontally aligned** with its corresponding grid row, so they read as one logical line
- **FR-4.3**: The status grid is a native **`<table>`** element (visible cell borders, aligned columns across all rows) with column headers (L1, L2, L3, L4, R1, R2, R3, R4) derived from CMD panel combinations
- **FR-4.4**: Grid columns are computed from CMD panel dropdown combinations (Side × Wheel). The grid also supports additional custom columns injected by the consumer, for reuse across different dashboard screens
- **FR-4.5**: Each status cell displays a **3-letter abbreviation** of the selected dropdown value for that wheel+row combination. Empty/unset cells remain blank — **no coloring**
- **FR-4.6**: Column hover highlights the entire column with a light background tint. Cell click applies a distinct border + stronger background on the focused cell

#### Data Flow

- **FR-4.7**: On initial load, the right panel shows the labels with an empty grid (all cells blank)
- **FR-4.8**: When the user changes a value on the left panel, the right panel does **not** update immediately
- **FR-4.9**: When the user clicks "Save", a POST API call is made. The right panel still does not update from the save response
- **FR-4.10**: A WebSocket connection runs in parallel. When the server confirms a change, it sends a message that updates the right panel — setting the cell abbreviations for the affected row(s) and column(s)
- **FR-4.11**: WebSocket messages support flexible update shapes:
  - **Full row update**: field + abbreviation values for all columns
  - **Partial update**: field + abbreviation values for specific columns only

### FR-5: Footer Actions (Save, Cancel, Default)

- **FR-5.1**: A "Cancel" button is displayed at the bottom-right of the **left panel** footer
- **FR-5.2**: A "Save" button is displayed next to the Cancel button
- **FR-5.3**: A "Default" button is displayed next to Cancel/Save in the footer
- **FR-5.4**: Clicking "Save" persists the current configuration (selected wheels and operation values) via POST API
- **FR-5.5**: Clicking "Cancel" discards unsaved changes and reverts to the last saved state
- **FR-5.6**: Clicking "Default" resets the **left panel only** to default values. The right panel (grid) is **not** affected
- **FR-5.7**: The "Save" button is visually prominent (filled/primary style). "Cancel" and "Default" are secondary style (outlined)

### FR-6: Layout and Responsiveness

- **FR-6.1**: The dashboard uses a two-panel side-by-side layout on desktop viewports
- **FR-6.2**: The left and right panels resize proportionally with the viewport — no fixed widths
- **FR-6.3**: The entire screen uses a dark theme with dark backgrounds and light text
- **FR-6.4**: A horizontal separator line sits below the top bar, separating it from the content panels
- **FR-6.5**: A vertical separator line sits between the left and right panels
- **FR-6.6**: CMD and OPERATIONS share a single visual section in the left panel, separated by a horizontal line
- **FR-6.7**: All elements (panels, text, inputs, buttons) scale fluidly — no fixed widths, heights, or font sizes that would prevent resizing
- **FR-6.8**: No layout shift at any reasonable desktop viewport size

### FR-7: Testing & Naming Infrastructure

- **FR-7.1**: Every dropdown and dropdown option element must have a `data-testid` attribute for Playwright e2e testing (to be implemented in a later phase)
- **FR-7.2**: All user-facing text (labels, dropdown option labels, section headings) should be sourced from a centralized key-value dictionary (translation-like approach), making it easy to swap naming conventions between environments (e.g., open demo vs. confidential deployment)
- **FR-7.3**: For code identifiers (function names, variable names, class names), use clear, domain-appropriate names that are easy to find-and-replace when adapting for a different naming convention. Document this as a future consideration.

---

## 4. User Scenarios & Acceptance Criteria

### Scenario 1: Initial Load

**Given** a user opens the Configuration Dashboard
**When** the page finishes loading
**Then**:
- The top bar shows the Scenario dropdown (left) only
- The CMD section shows two multi-select dropdowns (Side and Wheel) to the right of the "CMD" label, each defaulting to their first option
- The OPERATIONS section shows 11 rows with their specific dropdowns, all set to first option
- The right panel shows labels only (no values) with an empty grid (all cells blank)
- The grid has 8 column headers: L1, L2, L3, L4, R1, R2, R3, R4
- The footer shows Cancel, Save, and Default buttons

### Scenario 2: Configuring Operations (Left Panel Only)

**Given** the dashboard is loaded with default values
**When** the user changes dropdown 1 from "Not Active" to "Captive"
**Then**:
- The dropdown for row 1 on the **left** panel now displays "Captive"
- The right panel does **not** change — it still shows the last confirmed state (empty grid)
- The form is now dirty; the Save button remains available

### Scenario 3: Saving Configuration → WebSocket Update

**Given** the user has selected Left+Right sides, Wheels 1+2, and changed dropdown 1 to "Captive"
**When** the user clicks the "Save" button
**Then**:
- A POST API call sends the configuration to the server, including which wheels are affected and the current dropdown values
- The left panel form marks itself as pristine; the saved baseline updates
- The right panel does **not** update from the POST response
- Shortly after, the server pushes WebSocket messages
- Each message updates grid cells for the affected wheels: columns L1, L2, R1, R2 in row 1 now show "CAP" (abbreviation for Captive)

### Scenario 4: Canceling Changes

**Given** the user has modified operation dropdowns but has not saved
**When** the user clicks "Cancel"
**Then**:
- All left panel dropdowns revert to their last saved values
- The right panel remains unchanged (it already reflects the last confirmed state)

### Scenario 5: Resetting to Defaults (Default Button)

**Given** the user has made and possibly saved changes
**When** the user clicks "Default" in the footer
**Then**:
- All CMD dropdowns return to default values (first item)
- All operation dropdowns return to their default values (first option)
- The right panel (grid) is **NOT** affected — it retains its current confirmed state

### Scenario 6: Realtime Scenario Selection

**Given** the dashboard is in normal mode
**When** the user selects "Realtime" from the Scenario dropdown
**Then**:
- The entire left panel becomes disabled (visually dimmed with opacity)
- All dropdowns in CMD and Operations sections are non-interactive
- The Save, Cancel, and Default buttons are disabled
- The right panel continues to receive and display WebSocket updates

### Scenario 7: Grid Column Hover and Cell Focus

**Given** the right panel grid has data
**When** the user hovers over a grid column
**Then**: The entire column is highlighted with a light background tint
**When** the user clicks a cell
**Then**: The cell receives a distinct border + stronger background indicating focus

### Scenario 8: Multi-Select Dropdown (Video Type)

**Given** the dashboard is loaded
**When** the user opens dropdown 4 (Video Type) and selects multiple options
**Then**: The dropdown displays the selected options (multi-select behavior)
**When** the user saves and the server responds via WebSocket
**Then**: The affected grid cells show the appropriate abbreviation(s)

---

## 5. Technical Design

### Component Hierarchy

```
AppModule
│
└── AppComponent (root)
    │
    └── ConfigDashboardComponent (layout orchestrator)
        │
        ├── TopBarComponent (dumb)
        │   │  @Input:  selectedScenario, scenarioOptions
        │   │  @Output: scenarioChanged
        │   │
        │   └── AppDropdownComponent ← scenario selector
        │
        ├── LeftPanelComponent (container — passes values down, emits changes up)
        │   │  @Input:  disabled (from Realtime scenario)
        │   │  @Output: changed, saved, cancelled, defaultClicked
        │   │
        │   ├── CmdPanelComponent (dumb — emits side/wheel selections)
        │   │   │  @Input:  value, disabled
        │   │   │  @Output: changed
        │   │   │
        │   │   ├── AppMultiDropdownComponent ← Side (Left, Right)
        │   │   └── AppMultiDropdownComponent ← Wheel (1, 2, 3, 4)
        │   │
        │   ├── OperationsListComponent (dumb — emits dropdown changes)
        │   │   │  @Input:  value, disabled
        │   │   │  @Output: changed
        │   │   │
        │   │   ├── AppDropdownComponent ← row 1 (Not Active/Real/Captive)
        │   │   ├── AppDropdownComponent ← row 2 (No/Yes)
        │   │   ├── AppDropdownComponent ← row 3 "Video rec" (Internal/External)
        │   │   ├── AppMultiDropdownComponent ← row 4 "Video Type" (No/...)
        │   │   ├── AppDropdownComponent ← row 5 (No/Yes)
        │   │   ├── AppDropdownComponent ← row 6 "PWR On/Off" (On/Off)
        │   │   ├── AppDropdownComponent ← row 7 "Force" (Normal/Force F/Force No)
        │   │   ├── AppDropdownComponent ← row 8 (No/Yes)
        │   │   ├── AppDropdownComponent ← row 9 (No/Yes)
        │   │   ├── AppDropdownComponent ← row 10 (No/Yes)
        │   │   └── AppDropdownComponent ← row 11 (No/Yes)
        │   │
        │   └── [Footer buttons]
        │       ├── Default → emits defaultClicked (resets left panel only)
        │       ├── Cancel  → emits cancelled (reverts to saved baseline)
        │       └── Save    → emits saved (dashboard POST → WS updates grid)
        │
        └── StatusGridComponent (dumb — display only, right panel)
            │  @Input: config  (GridConfig — row defs + column defs)
            │  @Input: rows    (RowViewModel[] — data, starts empty, updated by WS)
            │
            ├── Labels column: field labels only (no values), aligned per row
            └── <table> grid: 8 columns (L1–L4, R1–R4) + optional custom columns
                Each cell: 3-letter abbreviation or blank
                Column hover: light background tint
                Cell click: border + stronger background focus
```

### Data Flow

The left and right panels are **independently driven**. The left panel is user-input-driven; the right panel is WebSocket-driven.

```
┌──────────────────────────────────────────────────────────────────┐
│              ConfigDashboardComponent                            │
│                                                                  │
│  LEFT PANEL (live user input)          RIGHT PANEL (confirmed)   │
│  ┌────────────────────────┐            ┌──────────────────────┐  │
│  │ LeftPanelComponent     │            │ StatusGridComponent   │  │
│  │  CmdPanel:             │            │   @Input: config      │  │
│  │    side: string[]      │            │   @Input: rows        │  │
│  │    wheel: string[]     │            │                       │  │
│  │  Operations:           │            │ Each row shows:       │  │
│  │    11 dropdown values  │            │  label | L1 L2..R4   │  │
│  └────────┬───────────────┘            │  (3-letter abbrs)    │  │
│           │ saved output               └──────────▲───────────┘  │
│           ▼                                       │              │
│  ┌─────────────────────┐                          │              │
│  │ POST /api/config    │   server processes       │              │
│  │ payload: {          │ ─────────────────────►   │              │
│  │   wheels: [...],    │   WebSocket push         │              │
│  │   controls: {...}   │   ┌──────────────────┐   │              │
│  │ }                   │   │ FieldUpdate msg  │───┘              │
│  └─────────────────────┘   │ { field, cells } │                  │
│                            └──────────────────┘                  │
│                                                                  │
│  DashboardStateService (left panel)                              │
│  ┌──────────────────────────────────────────────┐                │
│  │ state$             ◄── BehaviorSubject        │                │
│  │ savedBaseline      ◄── last saved snapshot    │                │
│  │                                               │                │
│  │ saveConfig(state) ──► POST /api/config         │                │
│  │ cancelChanges()   ──► restore savedBaseline    │                │
│  │ resetToDefaults() ──► reset left panel only    │                │
│  └──────────────────────────────────────────────┘                │
│                                                                  │
│  StatusGridService (right panel)                                 │
│  ┌──────────────────────────────────────────────┐                │
│  │ rows$              ◄── BehaviorSubject        │                │
│  │                                               │                │
│  │ applyUpdate(msg) ──► merge into rows$          │                │
│  │ connect() ─────────► WebSocket subscribe       │                │
│  │ disconnect() ──────► cleanup                   │                │
│  └──────────────────────────────────────────────┘                │
│                                                                  │
│  On initial load: rows$ seeded with empty grid                   │
│  (each row has labels, all cells blank)                          │
│                                                                  │
│  Grid config (column defs) computed by dashboard from            │
│  CMD panel options (Side × Wheel) + any custom columns           │
└──────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Type | Module | Description |
|-----------|------|--------|-------------|
| `ConfigDashboardComponent` | Layout orchestrator | `ConfigDashboardModule` | Two-panel shell + top bar wiring. Binds `TopBarComponent`, `LeftPanelComponent`, `StatusGridComponent`. Injects `DashboardStateService` and `StatusGridService`; handles `saved` / `cancelled` / `changed` / `defaultClicked` from the left panel. Computes grid config from CMD selections. |
| `LeftPanelComponent` | Container | `LeftPanelModule` | Container for CMD + Operations panels. `@Input`: `disabled`. `@Output`: `changed`, `saved`, `cancelled`, `defaultClicked`. Composes `CmdPanelComponent`, `OperationsListComponent`, and footer buttons (Save/Cancel/Default). |
| `TopBarComponent` | Dumb/Presentational | `TopBarModule` | Scenario dropdown only. Emits `scenarioChanged` upward. |
| `CmdPanelComponent` | Dumb/Presentational | `CmdPanelModule` | Two multi-select dropdowns (Side, Wheel). `@Input`: `value`, `disabled`. `@Output`: `changed`. |
| `OperationsListComponent` | Dumb/Presentational | `OperationsListModule` | 11 explicit dropdown rows (10 single + 1 multi). `@Input`: `value`, `disabled`. `@Output`: `changed`. Each dropdown has its own options defined in config. |
| `StatusGridComponent` | Dumb/Presentational | `StatusGridModule` | Receives `config` (GridConfig) and `rows` (RowViewModel[]) via `@Input`. Renders a `<table>` with column headers (L1–R4), labels column, and 3-letter abbreviation cells. Supports column hover and cell focus. Read-only. |
| `AppDropdownComponent` | Dumb/Presentational | `AppDropdownModule` | Generic single-select wrapper around `mat-select`. CVA provided by `AppDropdownCvaDirective`. |
| `AppMultiDropdownComponent` | Dumb/Presentational | `AppMultiDropdownModule` | Generic multi-select wrapper around `mat-select[multiple]`. CVA provided by `AppDropdownCvaDirective`. |

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
  - TopBar: "Scenario" label inline with its dropdown
  - CmdPanel: "CMD" label inline with the two multi-select dropdowns
  - OperationsListComponent rows: labels inline with their dropdowns
  - Global styles in `src/styles/_dropdowns.scss`
- **Section heading label**: The "OPR" / "OPERATIONS" label is displayed **above** the 11 operations rows as a section heading, not inline. It acts as a title for the section below it.

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

- **Parent → Child**: `@Input` bindings for data (value objects, disabled state, grid config, grid rows)
- **Child → Parent**: `@Output` EventEmitter for user actions (scenario changed, left panel `changed` / `saved` / `cancelled` / `defaultClicked`)
- **No CVA on dashboard components**: `CmdPanelComponent` and `OperationsListComponent` use simple `@Input() value` / `@Output() changed` pattern (no FormGroup, no ControlValueAccessor). CVA remains available on `AppDropdownComponent` and `AppMultiDropdownComponent` via `AppDropdownCvaDirective` for future form use.
- **Sibling Communication**: Two dedicated services, each managing one panel:
  - `DashboardStateService`: left panel state, saved baseline, save/cancel/default logic, POST API
  - `StatusGridService`: right panel grid rows, WebSocket subscription, `applyUpdate()` merge logic
- **Grid Data Flow**: `StatusGridService.rows$` is a `BehaviorSubject<RowViewModel[]>` seeded with empty grid on initial load. Updates come exclusively from WebSocket `FieldUpdate` messages (after a save triggers the server). The left panel state and right panel confirmed state are **independent**

### Form Architecture

- **Strategy**: Simple `@Input() value` / `@Output() changed` pattern on all dashboard child components (no Reactive Forms, no FormGroup, no CVA on dashboard components)
- **Top bar scenario**: Bound with `@Input` / `@Output` on `TopBarComponent` from `ConfigDashboardComponent`. "Realtime" selection disables the entire left panel.
- **Save / Cancel / Default**: `LeftPanelComponent` emits `saved` / `cancelled` / `defaultClicked`; `ConfigDashboardComponent` coordinates `DashboardStateService`
- **Default**: Resets left panel to defaults only. Right panel (grid) is NOT affected.

### Backend Integration

- **REST endpoint**: `POST /api/config` — sends the current dashboard state (selected wheels + operation values) on save
- **WebSocket**: `ws://…/api/ws` — receives `FieldUpdate` messages that update grid cells with 3-letter abbreviations
- `DashboardStateService` handles the POST; `StatusGridService` handles the WebSocket connection with auto-reconnect
- The `FieldUpdate` message format supports full-row and partial-column updates

---

## 6. Key Entities

| Entity | Description |
|--------|-------------|
| Scenario | A selectable scenario from the top bar dropdown (e.g., normal mode, "Realtime" disables left panel) |
| CMD Selection | Multi-select wheel targeting: Side (Left/Right) × Wheel (1/2/3/4). Determines which grid columns are affected on save. |
| Operation | One of 11 configurable vehicle controls, each assigned a value via dropdown |
| Option | A selectable value for an operation. Each option carries a `value`, `label`, and `abbr` (3-letter abbreviation displayed in grid cells) |
| Grid Cell | An individual cell in the grid table showing a 3-letter abbreviation for a specific wheel+operation combination |
| Grid Column | A column in the grid, representing one wheel (L1, L2, L3, L4, R1, R2, R3, R4) or a custom column |
| DashboardState | The combined state: selected scenario, CMD selections (sides + wheels), and 11 operation values |
| RowViewModel | A single grid row: field key, label, and cell abbreviations per column |
| GridConfig | Configuration object with row definitions and column definitions, passed as `@Input` to StatusGridComponent |

---

## 6b. Success Criteria

| # | Criterion | Measurement |
|---|-----------|-------------|
| SC-1 | Users can configure all 11 operations and save within 60 seconds | Task completion time |
| SC-2 | The dashboard loads and displays all elements within 3 seconds | Page load time |
| SC-3 | Users can save configurations and see grid updates via WebSocket | Save → WS → grid update verification |
| SC-4 | The status grid correctly shows 3-letter abbreviations for configured wheels | Visual accuracy check |
| SC-5 | All dropdown selections persist correctly after save | Persistence verification |
| SC-6 | Default returns left panel to defaults without affecting right panel | Default behavior verification |
| SC-7 | "Realtime" scenario disables the entire left panel | Disabled state verification |
| SC-8 | Column hover and cell focus work correctly | Interaction verification |
| SC-9 | All dropdowns and options have `data-testid` attributes | DOM inspection |

---

## 7. Scope & Boundaries

### In Scope

- Angular 13 project setup with Angular Material 13
- Dark-themed configuration dashboard component
- Two-panel layout (configuration controls + status grid)
- Dropdown-based command and operation selection via reusable `AppDropdownComponent` and `AppMultiDropdownComponent`
- CMD panel with two multi-select dropdowns (Side: Left/Right, Wheel: 1/2/3/4)
- Operations list with 11 explicit dropdowns, each with specific options and labels
- Simple `@Input`/`@Output` architecture (no Reactive Forms on dashboard components)
- Module-per-component pattern (each component in its own NgModule)
- Two dedicated services: `DashboardStateService` (left panel state + POST API) and `StatusGridService` (right panel grid state via WebSocket)
- Status grid as a native `<table>` with dynamic columns (L1–R4) computed from CMD selections, plus custom column support
- Grid cells showing 3-letter abbreviations (no coloring)
- Column hover highlight and cell focus behavior
- Save, Cancel, and Default functionality (Default only affects left panel)
- Scenario dropdown with "Realtime" option that disables the left panel
- `data-testid` attributes on dropdowns and options for Playwright
- Naming abstraction via key-value dictionary for label/text swappability
- Node.js backend (Express + WebSocket) for REST save and real-time grid updates
- Desktop viewport layout

### Out of Scope (Current Phase)

- User authentication and authorization
- Mobile or tablet responsive layouts
- Multi-user collaboration or concurrent editing
- Full internationalization (i18n) — only a simple key-value dictionary for naming swap
- Playwright e2e test implementation (testid infrastructure only)

---

## 8. Dependencies & Assumptions

### Dependencies

- Node.js (v14.x or v16.x) installed on the development machine
- npm available as the package manager
- Angular CLI v13.x available (can be installed via npx)

### Assumptions

- The Node.js backend (Express + WebSocket) is implemented and serves REST API + WebSocket for grid updates
- The 11 operations are fixed in count with specific options per dropdown
- Dropdown options are static and predefined, with each option carrying a 3-letter abbreviation
- The status grid is read-only for the user (populated via WebSocket, not manually edited)
- The dark theme follows the design from the Stitch project (obsidian/charcoal palette)
- Grid cells display 3-letter text abbreviations — no color-coded indicators
- Angular 13 does not support standalone components; the project uses NgModule-based architecture
- The `AppDropdownComponent` and `AppMultiDropdownComponent` wrap Angular Material's `mat-select`. CVA is available via directive but dashboard components use simple `@Input`/`@Output`
- Feature naming is temporary (driving simulation theme) and should be swappable via a centralized label dictionary

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

- **Top bar** spans the full width. On the left: a "Scenario" label and dropdown. A horizontal separator line sits below the top bar.
- **Left panel** contains the configuration controls in a single visual card:
  - "CMD" label on the left (inline), two multi-select dropdowns (Side, Wheel) to the right
  - A horizontal separator line between CMD and OPERATIONS
  - "OPR" label above the operations rows as a section heading
  - 11 rows of labeled dropdowns with specific options per row
  - Default + Cancel + Save buttons at the bottom-right of the left panel
- **Right panel** shows the **confirmed server state**:
  - Each row has a **label only** (no confirmed value) as plain text on the left, horizontally aligned with the **status grid** on the right
  - The label text is **outside** the grid — not a table column
  - The grid is a native `<table>` with column headers (L1, L2, L3, L4, R1, R2, R3, R4)
  - Each cell shows a **3-letter abbreviation** of the applied value, or is blank
  - Column hover highlights the entire column; cell click shows focus
  - On initial load, all cells are blank
  - Updates arrive only via WebSocket after a save operation
- A **vertical separator line** divides the left and right panels
- All elements are **fully responsive** — no fixed widths, heights, or font sizes. Everything scales with the viewport.

### Wireframe

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│  Scenario  [Normal ▾]                                                                   │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                               │                                                         │
│  CMD  [L,R ▾▾] [1,2,3,4 ▾▾]  │                    L1   L2   L3   L4   R1   R2   R3   R4│
│  ─────────────────────────── │                   ┌────┬────┬────┬────┬────┬────┬────┬────┐
│                               │  TTM             │CAP │CAP │    │    │CAP │CAP │    │    │
│  OPR                          │                  ├────┼────┼────┼────┼────┼────┼────┼────┤
│   TTM        [Captive ▾]      │  Weather         │ NO │ NO │    │    │ NO │ NO │    │    │
│   Weather    [No ▾]           │                  ├────┼────┼────┼────┼────┼────┼────┼────┤
│   Video rec  [Internal ▾]     │  Video rec       │INT │INT │    │    │INT │INT │    │    │
│   Video Type [No ▾▾]          │                  ├────┼────┼────┼────┼────┼────┼────┼────┤
│   Headlights [No ▾]           │  Video Type      │ NO │ NO │    │    │ NO │ NO │    │    │
│   PWR On/Off [On ▾]           │                  ├────┼────┼────┼────┼────┼────┼────┼────┤
│   Force      [Normal ▾]       │  Headlights      │ NO │ NO │    │    │ NO │ NO │    │    │
│   Stability  [No ▾]           │                  ├────┼────┼────┼────┼────┼────┼────┼────┤
│   Cruise Ctrl[No ▾]           │  PWR On/Off      │ ON │ ON │    │    │ ON │ ON │    │    │
│   PLR        [No ▾]           │                  ├────┼────┼────┼────┼────┼────┼────┼────┤
│   AUX        [No ▾]           │  Force           │NRM │NRM │    │    │NRM │NRM │    │    │
│                               │                  ├────┼────┼────┼────┼────┼────┼────┼────┤
│                               │  ...             │    │    │    │    │    │    │    │    │
│                               │                  └────┴────┴────┴────┴────┴────┴────┴────┘
│ [Default] [Cancel] [ Save ]   │                                                         │
│                               │  ▾▾ = multi-select dropdown                             │
│                               │  ▾  = single-select dropdown                            │
│                               │  Blank cells = not yet confirmed via WS                 │
│                               │  3-letter abbreviations = confirmed values               │
└───────────────────────────────┴─────────────────────────────────────────────────────────┘
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
