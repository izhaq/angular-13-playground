# Feature Specification: Configuration Dashboard

**Feature ID**: 1-config-dashboard
**Created**: 2026-04-02
**Last Updated**: 2026-04-16
**Status**: Implemented
**Branch**: `main` (merged via `8-rare-cmds-tab`)

---

## 1. Feature Overview

### Summary

A **tabbed configuration dashboard** for a driving simulation system, wrapped in a `DashboardWrapperComponent` that hosts a shared top bar and two tabs:

- **Tab 1 — Frequent CMDs**: 11 operations dropdowns (various options) + 3 CMD-to-test YES/NO dropdowns, with a status grid showing 3-letter abbreviations per wheel column.
- **Tab 2 — Rare CMDs**: 10 dropdowns (9 with Normal/Force/Ignore options, 1 with Yes/No) for infrequent operations, with its own status grid and independent state/API.

Both tabs share the same layout: each tab renders a **CMD panel at the tab level** (above the split), then a two-panel row — a **left panel** for operation dropdowns + footer and a **right panel** for the status grid. A single WebSocket connection broadcasts `FieldUpdate` messages to all tabs; each tab's `StatusGridService` instance filters by its own row definitions, ignoring unknown fields.

The dashboard supports additional custom grid columns for reuse across different screens.

### Problem Statement

Users need a centralized interface to configure vehicle simulation parameters per wheel and immediately see the applied configuration across all wheels in a status grid. Frequent and rare operations need to be separated into distinct tabs so engineers can focus on the relevant command set.

### Target Users

- Simulation engineers who configure and monitor vehicle parameters per wheel
- Test operators who need to quickly adjust simulation parameters and verify their application across wheels

### Business Value

- Reduces configuration time by consolidating wheel selection, vehicle control assignment, and per-wheel status visibility into a single screen
- Provides immediate visual feedback on per-wheel configuration through a text-based status grid
- Minimizes errors by offering constrained dropdown selections rather than free-form input
- Separates frequent and rare commands into dedicated tabs, reducing cognitive load

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
- Q: What do grid cells display? → A: **No coloring.** Each cell shows a **3-letter abbreviation** (from `CellValue.abbr`) of the selected value for that wheel+row combination; the server resolves abbreviations (`resolveAbbr`) and sends both full text and abbreviation in `CellValue`. Empty cells remain blank.
- Q: Should grid use `<table>` element? → A: Yes, a native `<table>` element for semantic correctness and simpler column hover behavior.

**Right Panel:**
- Q: Should the right panel show confirmed values next to labels? → A: **No** — show only labels (no values). The grid cells themselves convey the information via abbreviations.
- Q: Should the label list be extracted to a dedicated component? → A: Consider extracting to ensure alignment with grid rows remains clean.

**Top Bar:**
- Q: Where should the Default button be? → A: Move from top bar to **footer**, next to Cancel/Save buttons.
- Q: Does Default affect the right panel? → A: **No** — Default only resets the left panel to defaults. Right panel is unchanged.

**General:**
- Q: Should we add `data-testid` attributes? → A: Yes — coverage as specified in **FR-8.1** (dropdowns, options, tab labels, footer buttons, CMD panel, grid cells).
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

### FR-2: Command Selection Panel (CMD — Tab Level)

- **FR-2.1**: A "CMD" label is displayed to the **left** of the command dropdowns (inline, not above). The CMD block is rendered **at the tab level** (above the left/right split), not inside the left-panel card.
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
- **FR-3.6**: OPERATIONS and the CMD test section (Tab 1) share a single visual card in the left panel, separated by horizontal lines. The CMD wheel-targeting panel is **not** inside that card — it is rendered at the **tab level** above the left/right split (see FR-7.6).

### FR-4: Right Panel — Labels + Status Grid

The right panel shows the **confirmed server state**, not the live form state from the left panel. It updates only via WebSocket messages (after a successful save).

#### Layout

- **FR-4.1**: The right panel has two visual regions per row: a **label only** (no confirmed value) on the left, and the **status grid** on the right. The label is **not part of the grid** — it is plain text sitting outside the grid structure. Consider extracting the label list into a dedicated component for alignment purposes.
- **FR-4.2**: Each label is **horizontally aligned** with its corresponding grid row, so they read as one logical line
- **FR-4.3**: The status grid is a native **`<table>`** element (visible cell borders, aligned columns across all rows) with column headers (L1, L2, L3, L4, R1, R2, R3, R4) derived from CMD panel combinations
- **FR-4.4**: Grid columns are computed from CMD panel dropdown combinations (Side × Wheel). The grid also supports additional custom columns injected by the consumer, for reuse across different dashboard screens
- **FR-4.5**: Each status cell holds a **`CellValue`** object: `value` (full text) and `abbr` (abbreviation shown in the grid, typically 3 letters) for that wheel+row combination. Empty/unset cells remain blank — **no coloring**
- **FR-4.6**: Column hover highlights the entire column with a light background tint. Cell click applies a distinct border + stronger background on the focused cell
- **FR-4.6b**: On cell hover, a pop-out overlay animates above the cell, displaying the full value text (e.g., "Normal" instead of "NRM"). The popout scales up with a smooth animation and elevated shadow. The abbreviation is hidden while the popout is visible.

#### Data Flow

- **FR-4.7**: On initial load, the right panel shows the labels with an empty grid (all cells blank)
- **FR-4.8**: When the user changes a value on the left panel, the right panel does **not** update immediately
- **FR-4.9**: When the user clicks "Save", a POST API call is made. The right panel still does not update from the save response
- **FR-4.10**: A WebSocket connection runs in parallel. When the server confirms a change, it sends a message that updates the right panel — setting **`CellValue`** objects (`value` + `abbr`) for the affected row(s) and column(s)
- **FR-4.11**: WebSocket messages support flexible update shapes:
  - **Full row update**: field + `CellValue` entries for all columns
  - **Partial update**: field + `CellValue` entries for specific columns only

### FR-5: Footer Actions (Save, Cancel, Default)

- **FR-5.1**: A "Cancel" button is displayed at the bottom-right of the **left panel** footer
- **FR-5.2**: A "Save" button is displayed next to the Cancel button
- **FR-5.3**: A "Default" button is displayed next to Cancel/Save in the footer
- **FR-5.4**: Clicking "Save" persists the current configuration (selected wheels and operation values) via POST API
- **FR-5.5**: Clicking "Cancel" discards unsaved changes and reverts to the last saved state
- **FR-5.6**: Clicking "Default" resets the **left panel only** to default values. The right panel (grid) is **not** affected
- **FR-5.7**: The "Save" button is visually prominent (filled/primary style). "Cancel" and "Default" are secondary style (outlined)

### FR-6: Tabbed Dashboard Architecture

- **FR-6.1**: The dashboard is wrapped in a `DashboardWrapperComponent` that contains the `TopBarComponent` above a `<mat-tab-group>`
- **FR-6.2**: Two tabs are rendered: "Frequent CMDs" (Tab 1) and "Rare CMDs" (Tab 2)
- **FR-6.3**: The `TopBarComponent` remains above the tab strip and is shared across both tabs
- **FR-6.4**: Selecting "Realtime" from the Scenario dropdown disables the left panel of **both** tabs
- **FR-6.5**: Each tab has its own footer (via `PanelFooterComponent`); "Save" only saves the active tab's left panel state
- **FR-6.6**: Each tab has its own status grid with different row definitions. Tab 1 uses the eight wheel columns (L1–R4) as a baseline and may add consumer-injected columns (FR-4.4). Tab 2's rare grid uses L1–R4 plus TTL, TTR, and SSL (FR-6b.4–FR-6b.5).
- **FR-6.7**: A single WebSocket connection is shared; each tab's `StatusGridService` ignores fields not in its row definitions
- **FR-6.8**: Tabs maintain their state when switching (Angular Material's default `mat-tab-group` behavior)

### FR-6b: Rare CMDs Tab (Tab 2)

- **FR-6b.1**: The Rare CMDs tab contains 10 dropdowns (9 with Normal/Force/Ignore options, 1 with Yes/No) for infrequent operations:

| # | Key | Label | Options (abbr) | Default |
|---|-----|-------|----------------|---------|
| 1 | absCriticalFail | ABS Critical Fail | Normal (NRM), Force (FRC), Ignore (IGN) | Normal |
| 2 | absWarningFail | ABS Warning Fail | Normal (NRM), Force (FRC), Ignore (IGN) | Normal |
| 3 | absFatalFail | ABS Fatal Fail | Normal (NRM), Force (FRC), Ignore (IGN) | Normal |
| 4 | brakeCriticalFail | Brake Critical Fail | Normal (NRM), Force (FRC), Ignore (IGN) | Normal |
| 5 | masterResetFail | Master Reset Fail | Normal (NRM), Force (FRC), Ignore (IGN) | Normal |
| 6 | flashCriticalFail | Flash Critical Fail | Normal (NRM), Force (FRC), Ignore (IGN) | Normal |
| 7 | busTempFail | Bus Temp Fail | Normal (NRM), Force (FRC), Ignore (IGN) | Normal |
| 8 | tireCommFail | Tire Comm Fail | No (NO), Yes (YES) | No |
| 9 | fuelMapTempFail | Fuel Map Temp Fail | Normal (NRM), Force (FRC), Ignore (IGN) | Normal |
| 10 | coolantCriticalFail | Coolant Critical Fail | Normal (NRM), Force (FRC), Ignore (IGN) | Normal |

- **FR-6b.2**: The tab component (`RareCmdsTabComponent`) renders the shared `CmdPanelComponent` **at the tab level**, directly **above** the left panel content — the CMD panel is **not** inside `RareLeftPanelComponent`. The left panel contains `RareOperationsListComponent` and `PanelFooterComponent` only.
- **FR-6b.3**: Save sends a POST to `/api/rare-config` with `RareDashboardState` payload
- **FR-6b.4**: The status grid has 10 rows (one per rare operation) × 11 columns (L1–R4 + TTL, TTR, SSL)
- **FR-6b.5**: The Rare CMDs grid has 3 extra columns (TTL, TTR, SSL) driven by server-side logic. TTL updates when the left side is selected for fields: `absFatalFail`, `brakeCriticalFail`, `busTempFail`, `tireCommFail`. TTR updates when the right side is selected for the same fields. SSL always updates for fields: `fuelMapTempFail`, `coolantCriticalFail`. Wheel selection is ignored for these extra columns.

### FR-7: Layout and Responsiveness

- **FR-7.1**: The dashboard uses a two-panel side-by-side layout on desktop viewports within each tab
- **FR-7.2**: Inside the **FR-7.10** shell, the left and right panels resize proportionally — no fixed widths for those inner regions (the outer dashboard footprint is fixed per FR-7.10)
- **FR-7.3**: The entire screen uses a dark theme with dark backgrounds and light text
- **FR-7.4**: A horizontal separator line sits below the top bar, separating it from the tab strip
- **FR-7.5**: A vertical separator line sits between the left and right panels in each tab
- **FR-7.6**: The CMD panel sits **at the tab level** above the left/right split. Tab 1: OPERATIONS + CMD test share the left-panel card; Tab 2: rare operations share the left-panel card.
- **FR-7.7**: All elements (panels, text, inputs, buttons) scale fluidly — no fixed widths, heights, or font sizes that would prevent resizing
- **FR-7.8**: No layout shift at any reasonable desktop viewport size
- **FR-7.9**: The CMD panel (top) is sticky **at the tab level** (not inside each left panel). The footer (bottom) of each left panel remains sticky; the operations list scrolls if needed
- **FR-7.10**: The dashboard is constrained to a fixed container of **1120px width × 500px height**, positioned at the **bottom-left** corner of the viewport. All spacing is tightened for compact display.

### FR-8: Testing & Naming Infrastructure

- **FR-8.1**: `data-testid` attributes are implemented on all dropdowns, tab labels, footer buttons, CMD panel dropdowns, and grid cells (cell format: `cell-{field}-{columnId}`), including dropdown options where applicable, for Playwright e2e testing
- **FR-8.2**: All user-facing text (labels, dropdown option labels, section headings) should be sourced from a centralized key-value dictionary (translation-like approach), making it easy to swap naming conventions between environments (e.g., open demo vs. confidential deployment)
- **FR-8.3**: For code identifiers (function names, variable names, class names), use clear, domain-appropriate names that are easy to find-and-replace when adapting for a different naming convention. Document this as a future consideration.

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
    └── DashboardWrapperComponent (layout orchestrator, owns TopBar + tabs)
        │  Provides: WsService (single WebSocket for all tabs)
        │
        ├── TopBarComponent (dumb — above tab strip)
        │   │  @Input:  selectedScenario, scenarioOptions
        │   │  @Output: scenarioChanged
        │   │
        │   └── AppDropdownComponent ← scenario selector
        │
        └── <mat-tab-group>
            │
            ├── Tab 1: "Frequent CMDs" → FrequentCmdsTabComponent
            │   │  @Input: scenario, isRealtime
            │   │  Provides: StatusGridService (own instance)
            │   │  Service:  TabStateService<DashboardState> (provided on tab + TAB_STATE_CONFIG)
            │   │
            │   ├── CmdPanelComponent (TAB LEVEL — shared, dumb; not inside LeftPanel)
            │   │   │  @Input:  value, disabled
            │   │   │  @Output: changed
            │   │   ├── AppMultiDropdownComponent ← Side (Left, Right)
            │   │   └── AppMultiDropdownComponent ← Wheel (1, 2, 3, 4)
            │   │
            │   ├── LeftPanelComponent (container)
            │   │   │  @Input:  dashboardState, disabled
            │   │   │  @Output: stateChanged, saved, cancelled, defaultClicked
            │   │   │
            │   │   ├── OperationsListComponent (dumb — 11 dropdowns)
            │   │   │   │  @Input:  value, disabled
            │   │   │   │  @Output: changed
            │   │   │   └── 11× AppDropdownComponent / AppMultiDropdownComponent
            │   │   │
            │   │   ├── CmdTestPanelComponent (dumb — 3 YES/NO dropdowns)
            │   │   │   │  @Input:  value, disabled
            │   │   │   │  @Output: changed
            │   │   │   └── 3× AppDropdownComponent
            │   │   │
            │   │   └── PanelFooterComponent (shared, dumb)
            │   │       │  @Input:  disabled
            │   │       │  @Output: defaultClicked, cancelled, saved
            │   │
            │   └── StatusGridComponent (shared, dumb — right panel)
            │       │  @Input: config (GridConfig), rows (RowViewModel[])
            │       └── <table> with 14 rows × 8 columns (L1–R4)
            │
            └── Tab 2: "Rare CMDs" → RareCmdsTabComponent
                │  @Input: scenario, isRealtime
                │  Provides: StatusGridService (own instance)
                │  Service:  TabStateService<RareDashboardState> (provided on tab + TAB_STATE_CONFIG)
                │
                ├── CmdPanelComponent (TAB LEVEL — shared, reused; not inside RareLeftPanel)
                │   │  @Input:  value, disabled
                │   │  @Output: changed
                │   ├── AppMultiDropdownComponent ← Side (Left, Right)
                │   └── AppMultiDropdownComponent ← Wheel (1, 2, 3, 4)
                │
                ├── RareLeftPanelComponent (container)
                │   │  @Input:  dashboardState, disabled
                │   │  @Output: stateChanged, saved, cancelled, defaultClicked
                │   │
                │   ├── RareOperationsListComponent (dumb — 10 dropdowns per FR-6b.1)
                │   │   │  @Input:  value, disabled
                │   │   │  @Output: changed
                │   │   └── 10× AppDropdownComponent
                │   │
                │   └── PanelFooterComponent (shared, reused)
                │
                └── StatusGridComponent (shared, reused — right panel)
                    │  @Input: config (GridConfig), rows (RowViewModel[])
                    └── <table> with 10 rows × 11 columns (L1–R4 + TTL, TTR, SSL)
```

### Data Flow

Each tab has **independent left and right panels**. The left panel is user-input-driven; the right panel is WebSocket-driven. A single WebSocket connection is shared across all tabs.

```
┌─────────────────────────────────────────────────────────────────────┐
│              DashboardWrapperComponent                               │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  TopBarComponent (scenario dropdown)                         │    │
│  └──────────────────────────┬──────────────────────────────────┘    │
│                              │ scenario, isRealtime                  │
│  ┌───────────────────────────▼──────────────────────────────────┐   │
│  │  <mat-tab-group>                                              │   │
│  │  ┌─────────────────────────────────────────────────────────┐  │   │
│  │  │  Tab 1: FrequentCmdsTabComponent                         │  │   │
│  │  │  CmdPanel (tab level) │  RIGHT PANEL (StatusGrid)        │  │   │
│  │  │  LEFT PANEL           │  config: 14 rows × 8 cols        │  │   │
│  │  │  LeftPanelComponent   │  rows ◄── StatusGridService[1]   │  │   │
│  │  │   OperationsList (11) │                                   │  │   │
│  │  │   CmdTestPanel (3)    │  WsService.message$              │  │   │
│  │  │   PanelFooter         │    ──► applyUpdate()              │  │   │
│  │  │         │             │                                   │  │   │
│  │  │    Save ▼             │                                   │  │   │
│  │  │  POST /api/config ────┼──► server ──► WS broadcast       │  │   │
│  │  └───────────────────────┴───────────────────────────────────┘  │   │
│  │  ┌─────────────────────────────────────────────────────────┐  │   │
│  │  │  Tab 2: RareCmdsTabComponent                             │  │   │
│  │  │  CmdPanel (tab level)      │  RIGHT PANEL (StatusGrid)   │  │   │
│  │  │  LEFT PANEL                │  config: 10 rows × 11 cols  │  │   │
│  │  │  RareLeftPanelComponent    │  rows ◄── StatusGridService[2]│ │   │
│  │  │   RareOperationsList (10)  │                              │  │   │
│  │  │   PanelFooter (shared)     │  WsService.message$          │  │   │
│  │  │         │                  │    ──► applyUpdate()          │  │   │
│  │  │    Save ▼                  │                              │  │   │
│  │  │  POST /api/rare-config ────┼──► server ──► WS broadcast  │  │   │
│  │  └────────────────────────────┴──────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  WsService (shared, provided at DashboardWrapper level)             │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  message$ ◄── Subject<FieldUpdate>                             │  │
│  │  Manages single WsConnection to /api/ws                        │  │
│  │  Broadcasts all messages to all subscribers                    │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  TabStateService<T> + TabStateConfig (InjectionToken TAB_STATE_CONFIG) │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  Tab 1: TabStateService<DashboardState> — POST /api/config      │  │
│  │  Tab 2: TabStateService<RareDashboardState> — POST /api/rare-config │
│  │  state$ ◄── BehaviorSubject | savedBaseline                    │  │
│  │  saveConfig(state) / cancelChanges() / resetToDefaults()        │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  StatusGridService (component-level, one instance per tab)          │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  gridRows$ ◄── BehaviorSubject<RowViewModel[]>                 │  │
│  │  configure(columns, rowDefs) ──► seeds empty grid (CellValue)  │  │
│  │  applyUpdate(msg) ──► merge CellValue data (ignores unknown)   │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

### Tab-level state services

Implementation files: `dashboard-wrapper/services/tab-state.service.ts`, `dashboard-wrapper/services/tab-state.config.ts`.

- **`TabStateService<T>`**: Single generic tab state service (BehaviorSubject-backed state, saved baseline, save / cancel / default). Provide **one instance per tab** on `FrequentCmdsTabComponent` / `RareCmdsTabComponent` (not `providedIn: 'root'`), each with a **distinct** `T` (`DashboardState` vs `RareDashboardState`) and a matching **`TabStateConfig`** bound through **`TAB_STATE_CONFIG`** (endpoints, defaults, tab-specific wiring).
- **`TabStateConfig`**: Plain configuration object (or factory result) consumed by `TabStateService<T>` so one implementation serves both tabs without duplicate service classes.

### Component Responsibilities

| Component | Type | Module | Location | Description |
|-----------|------|--------|----------|-------------|
| `DashboardWrapperComponent` | Layout orchestrator | `DashboardWrapperModule` | `dashboard-wrapper/` | Hosts TopBar + `<mat-tab-group>` with two tabs. Manages `scenario` state and `isRealtime` flag. Provides `WsService` at component level. |
| `FrequentCmdsTabComponent` | Tab container | `FrequentCmdsTabModule` | `dashboard-wrapper/components/frequent-cmds-tab/` | Tab 1: owns `TabStateService<DashboardState>` (via `TAB_STATE_CONFIG`), per-tab `StatusGridService`. Renders `CmdPanelComponent` at tab level; wires left panel events to state service and grid. |
| `RareCmdsTabComponent` | Tab container | `RareCmdsTabModule` | `dashboard-wrapper/components/rare-cmds-tab/` | Tab 2: owns `TabStateService<RareDashboardState>` (via `TAB_STATE_CONFIG`), per-tab `StatusGridService`. Renders `CmdPanelComponent` at tab level; same pattern as Tab 1 with different operations. |
| `TopBarComponent` | Dumb | `TopBarModule` | `dashboard-wrapper/components/top-bar/` | Scenario dropdown only. Emits `scenarioChanged` upward. |
| `LeftPanelComponent` | Container | `LeftPanelModule` | `frequent-cmds-tab/components/left-panel/` | Tab 1 left panel: OperationsList + CmdTestPanel + PanelFooter (`CmdPanelComponent` is sibling at tab level). |
| `RareLeftPanelComponent` | Container | `RareLeftPanelModule` | `rare-cmds-tab/components/rare-left-panel/` | Tab 2 left panel: RareOperationsList + PanelFooter (`CmdPanelComponent` is sibling at tab level). |
| `CmdPanelComponent` | Dumb (shared) | `CmdPanelModule` | `dashboard-wrapper/components/cmd-panel/` | Two multi-select dropdowns (Side, Wheel). Shared by both tabs. |
| `PanelFooterComponent` | Dumb (shared) | `PanelFooterModule` | `dashboard-wrapper/components/panel-footer/` | Default + Cancel + Save buttons. Shared by both tabs. |
| `StatusGridComponent` | Dumb (shared) | `StatusGridModule` | `dashboard-wrapper/components/status-grid/` | Renders `<table>` with column headers, labels, and **`CellValue`** cells (`abbr` in grid, `value` for hover). Shared by both tabs with per-tab `config` and `rows`. |
| `OperationsListComponent` | Dumb | `OperationsListModule` | `frequent-cmds-tab/components/frequent-operations-list/` | 11 dropdown rows for frequent operations. |
| `CmdTestPanelComponent` | Dumb | `CmdTestPanelModule` | `frequent-cmds-tab/components/cmd-test-panel/` | 3 YES/NO dropdowns for CMD-to-test section (Tab 1 only). |
| `RareOperationsListComponent` | Dumb | `RareOperationsListModule` | `rare-cmds-tab/components/rare-operations-list/` | 10 dropdown rows for rare operations (per FR-6b.1). |
| `AppDropdownComponent` | Dumb | `AppDropdownModule` | `app-dropdown/` | Generic single-select wrapper around `mat-select`. CVA via `AppDropdownCvaDirective`. |
| `AppMultiDropdownComponent` | Dumb | `AppMultiDropdownModule` | `app-multi-dropdown/` | Generic multi-select wrapper around `mat-select[multiple]`. CVA via `AppDropdownCvaDirective`. |

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

1. **No fixed dimensions** (except the dashboard shell in **FR-7.10**): Aside from the intentional **1120×500** outer container, avoid fixed `width`, `height`, or `font-size` in `px` that would prevent inner regions from scaling. Use `flex`, `%`, `fr`, `auto`, `min-content`/`max-content` for inner layout sizing. Use relative units (`rem`, `em`) for font sizes and spacing where appropriate, or `px` from SCSS variables that can be changed in one place.
2. **No layout shift**: Elements must not jump, overflow, or cause scrollbars at any reasonable desktop viewport size. Use `flex-shrink`, `min-width: 0`, `overflow` strategies to handle content gracefully.
3. **SCSS nesting**: Use SCSS's nesting (`&`) to express parent-child relationships clearly. Avoid flat, disconnected class selectors. Structure SCSS to mirror the template's DOM hierarchy.
4. **Minimum boilerplate**: Keep templates, styles, and component code as lean as possible. No redundant wrappers, no unnecessary classes, no verbose selectors. Every line of code must earn its place.
5. **SCSS variables for theming**: All colors, spacing, typography, and border values must come from SCSS variables. Global tokens live in `src/styles/_variables.scss`. Component-specific values (e.g., separator opacity, panel proportions) are defined as local SCSS variables at the top of the component's `.scss` file. This makes the dashboard easy to re-theme when copied to another project.
6. **Portability-first styling**: Styles must be structured so that changing `_variables.scss` is sufficient to adapt the dashboard to a different project's design system. No hardcoded hex colors, font names, or magic numbers scattered through component styles.
7. **No `::ng-deep`**: Angular Material component styling overrides must use **global SCSS partials** (e.g., `src/styles/_dropdowns.scss`, `src/styles/_tabs.scss`) imported in `src/styles.scss`, scoped by the component's element selector (e.g., `app-dashboard-wrapper .mat-tab-body-wrapper`). Never use `::ng-deep`.
8. **Sticky header/footer**: The CMD panel (top) is sticky at the **tab** level; PanelFooter (bottom) in each left panel is sticky. The middle content area (operations lists) scrolls if needed. Achieved via flexbox with `flex-shrink: 0` on header/footer and `flex: 1; overflow-y: auto` on the content area.
9. **Read-only outputs**: Declare `readonly` on all `@Output()` `EventEmitter` properties so consumers cannot reassign the emitter reference.

### Co-Location & Portability Rules

Models, services, and related code follow these placement rules:

1. **Co-locate with component**: Models and services that serve a single component live in that component's folder, inside `models/` and `services/` subdirectories respectively
2. **Closest common parent**: Shared components and services bubble up only to the nearest ancestor that needs them (e.g., `CmdPanelComponent` and `PanelFooterComponent` are in `dashboard-wrapper/components/` because they are shared by both tabs)
3. **Services in folders**: Services always live in a `services/` subdirectory, never as loose files
4. **App-level = mocks/APIs only**: `src/app/mocks/` holds project-wide mock data
5. **Dashboard is portable**: All dashboard-related code lives under `components/dashboard-wrapper/` so the entire folder can be relocated

Module structure per component:

```
src/app/components/<component-name>/
├── <component-name>.component.ts
├── <component-name>.component.html
├── <component-name>.component.scss
├── <component-name>.component.spec.ts
├── <component-name>.module.ts
├── <component-name>.models.ts              (if component has its own models)
├── models/                                  (if multiple model files needed)
└── services/                                (if component has its own services)
```

Full folder structure:

```
src/app/components/
├── app-dropdown/                               (generic single-select)
├── app-dropdown-cva/                           (CVA directive)
├── app-multi-dropdown/                         (generic multi-select)
└── dashboard-wrapper/                          (main dashboard shell)
    ├── dashboard-wrapper.component.*
    ├── dashboard-wrapper.module.ts
    ├── services/
    │   ├── ws.service.ts                       (shared WebSocket service)
    │   ├── ws.service.spec.ts
    │   ├── ws-connection.ts                    (WebSocket connection utility)
    │   ├── tab-state.config.ts                 (TabStateConfig + TAB_STATE_CONFIG)
    │   └── tab-state.service.ts              (TabStateService<T>)
    └── components/
        ├── top-bar/                            (shared — above tab strip)
        ├── cmd-panel/                          (shared — used by both tabs)
        ├── panel-footer/                       (shared — used by both tabs)
        ├── status-grid/                        (shared — used by both tabs)
        │   ├── models/                         (grid.models.ts incl. CellValue, grid-defaults.ts; optional helpers for local form display — WS cells use server `CellValue`)
        │   └── services/                       (status-grid.service.ts)
        ├── frequent-cmds-tab/                  (Tab 1)
        │   ├── models/                         (dashboard.models.ts, dashboard-defaults.ts, dashboard-view.model.ts, frequent-grid-config.ts)
        │   └── components/
        │       ├── left-panel/
        │       ├── frequent-operations-list/
        │       └── cmd-test-panel/
        └── rare-cmds-tab/                      (Tab 2)
            ├── models/                         (rare-dashboard.models.ts, rare-dashboard-defaults.ts, rare-grid-config.ts)
            └── components/
                ├── rare-left-panel/
                └── rare-operations-list/
```

Import chain:

```
AppModule
└── imports: DashboardWrapperModule
    └── imports: TopBarModule, FrequentCmdsTabModule, RareCmdsTabModule, MatTabsModule
        ├── FrequentCmdsTabModule imports: CmdPanelModule, LeftPanelModule, StatusGridModule
        │   └── LeftPanelModule imports: OperationsListModule, CmdTestPanelModule, PanelFooterModule
        └── RareCmdsTabModule imports: CmdPanelModule, RareLeftPanelModule, StatusGridModule
            └── RareLeftPanelModule imports: RareOperationsListModule, PanelFooterModule
```

### Portability

The dashboard is designed to be self-contained and relocatable:

- **Migration guide**: [migration.md](./migration.md) — full file list, dependencies, configuration steps, and checklist for copying the dashboard to another project
- **Naming swap**: [naming-swap.md](./naming-swap.md) — JSON-driven automated rename system (`tools/naming-map.json` + `tools/rename.sh`) for swapping all domain-specific identifiers (UI labels, code identifiers, file/folder names, CSS classes, API paths) in a single pass

### Inter-Component Communication

- **Parent → Child**: `@Input` bindings for data (value objects, disabled state, grid config, grid rows)
- **Child → Parent**: `@Output` EventEmitter for user actions (scenario changed, left panel `stateChanged` / `saved` / `cancelled` / `defaultClicked`)
- **No CVA on dashboard components**: All dashboard components use simple `@Input() value` / `@Output() changed` pattern. CVA remains available on `AppDropdownComponent` and `AppMultiDropdownComponent` via `AppDropdownCvaDirective` for future form use.
- **Per-Tab State Services**: Each tab **component** provides its own **`TabStateService<T>`** instance alongside **`TAB_STATE_CONFIG`** → **`TabStateConfig`**: Tab 1 binds `T = DashboardState` and POST `/api/config`; Tab 2 binds `T = RareDashboardState` and POST `/api/rare-config`.
- **Per-Tab Grid Service**: `StatusGridService` is provided at the component level (not `providedIn: root`), so each tab gets its own instance with its own row definitions. Grid cell text comes from server-delivered **`CellValue`** objects (not client-side abbreviation mapping for WebSocket updates).
- **Shared WebSocket**: `WsService` (provided at `DashboardWrapperComponent` level) manages a single `WsConnection` and broadcasts all `FieldUpdate` messages via `message$` Subject. Each tab subscribes and calls its own `StatusGridService.applyUpdate()` — unknown fields are silently ignored (`findIndex === -1` → no-op)
- **Grid Data Flow**: `StatusGridService.gridRows$` is a `BehaviorSubject<RowViewModel[]>` seeded with empty grid on `configure()`. Updates come from WebSocket `FieldUpdate` messages carrying **`CellValue`** data. Left panel state and right panel confirmed state are **independent**

### Form Architecture

- **Strategy**: Simple `@Input() value` / `@Output() changed` pattern on all dashboard child components (no Reactive Forms, no FormGroup, no CVA on dashboard components)
- **Top bar scenario**: Bound with `@Input` / `@Output` on `TopBarComponent` from `DashboardWrapperComponent`. "Realtime" selection disables the left panel of **both** tabs via `isRealtime` input.
- **Save / Cancel / Default**: Each tab's left panel emits `saved` / `cancelled` / `defaultClicked`; the tab component coordinates its own **`TabStateService<T>`** instance. Save only saves the **active tab's** left panel state.
- **Default**: Resets left panel to defaults only. Right panel (grid) is NOT affected.
- **Tab state preservation**: Angular Material's `mat-tab-group` preserves tab content by default — switching tabs does not destroy/recreate components.

### Backend Integration

- **REST endpoints**:
  - `POST /api/config` — saves frequent CMDs state (Tab 1)
  - `GET /api/config` — retrieves last saved frequent CMDs state
  - `POST /api/rare-config` — saves rare CMDs state (Tab 2)
  - `GET /api/rare-config` — retrieves last saved rare CMDs state
  - `GET /api/health` — health check
- **WebSocket**: `ws://…/api/ws` — receives `FieldUpdate` messages that update grid cells with **`CellValue`** payloads (`value`, `abbr`). Abbreviation resolution (**`resolveAbbr`**) runs **server-side**; the client displays `abbr` in cells and `value` on hover (FR-4.6b) — **no** client-side abbreviation mapping for WebSocket-driven grid data.
- `WsService` manages the single WebSocket connection with auto-reconnect via `WsConnection`
- Each tab's **`TabStateService<T>`** handles its own POST endpoint per `TabStateConfig`
- The `FieldUpdate` message format supports full-row and partial-column updates

---

## 6. Key Entities

| Entity | Description |
|--------|-------------|
| Scenario | A selectable scenario from the top bar dropdown (e.g., normal mode, "Realtime" disables left panel of all tabs) |
| CMD Selection | Multi-select wheel targeting: Side (Left/Right) × Wheel (1/2/3/4). Determines which grid columns are affected on save. Shared by both tabs. |
| Frequent Operation | One of 11 configurable vehicle controls (Tab 1), each assigned a value via dropdown |
| Rare Operation | One of 10 rare vehicle controls (Tab 2) per FR-6b.1, for infrequent calibration/diagnostic operations |
| CMD Test | One of 3 YES/NO test toggles (Tab 1 only) |
| Option | A selectable value for an operation. Each option carries a `value`, `label`, and `abbr` (used for labels and local UX; WebSocket-confirmed grid cells use `CellValue` from the server) |
| CellValue | Server-driven cell payload: `value` (full text) and `abbr` (abbreviation shown in the grid) |
| Grid Cell | An individual cell in the grid table holding a **`CellValue`** (abbreviation shown; full text on hover per FR-4.6b) for a wheel+operation combination |
| Grid Column | A column in the grid: wheel columns (L1–R4), optional custom columns (Tab 1), or on Tab 2 the extra server-driven columns **TTL**, **TTR**, **SSL** (FR-6b.5) |
| DashboardState | The combined state for Tab 1: scenario, CMD selections, 11 operations, 3 CMD tests |
| RareDashboardState | The combined state for Tab 2: scenario, CMD selections, 10 rare operations |
| RowViewModel | A single grid row: field key, label, and **`CellValue`** (or empty) per column |
| GridConfig | Configuration object with row definitions and column definitions, passed as `@Input` to StatusGridComponent |
| WsService | Shared WebSocket manager broadcasting `FieldUpdate` messages to all tab subscribers |

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
| SC-9 | All interactive targets and grid cells expose `data-testid` per FR-8.1 | DOM inspection |

---

## 7. Scope & Boundaries

### In Scope

- Angular 13 project setup with Angular Material 13
- Dark-themed tabbed configuration dashboard
- `DashboardWrapperComponent` with shared `TopBarComponent` above `<mat-tab-group>`
- **Tab 1 — Frequent CMDs**: 11 operations + 3 CMD test dropdowns, `TabStateService<DashboardState>` with `TAB_STATE_CONFIG`, POST to `/api/config`
- **Tab 2 — Rare CMDs**: 10 rare operations dropdowns (FR-6b.1), `TabStateService<RareDashboardState>` with `TAB_STATE_CONFIG`, POST to `/api/rare-config`
- Two-panel layout per tab (configuration controls + status grid)
- Shared components: `CmdPanelComponent`, `PanelFooterComponent`, `StatusGridComponent`
- Dropdown-based command and operation selection via reusable `AppDropdownComponent` and `AppMultiDropdownComponent`
- CMD panel with two multi-select dropdowns (Side: Left/Right, Wheel: 1/2/3/4)
- Simple `@Input`/`@Output` architecture (no Reactive Forms on dashboard components)
- Module-per-component pattern (each component in its own NgModule)
- Per-tab **`TabStateService<T>`** (`TAB_STATE_CONFIG` / `TabStateConfig`) + per-tab `StatusGridService` instances (component-level providers)
- Single shared `WsService` with `WsConnection` for WebSocket; each tab filters by its row definitions
- Status grid as a native `<table>` with dynamic columns (L1–R4; Tab 2 adds TTL/TTR/SSL per FR-6b.4–FR-6b.5), **`CellValue`** cells (`abbr` / `value`)
- Column hover highlight and cell focus behavior
- Save, Cancel, and Default per tab (Default only affects left panel)
- Scenario dropdown with "Realtime" option that disables left panel of **both** tabs
- Tab state preservation on tab switch
- Sticky CMD panel (top) at **tab** level and footer (bottom) in each left panel (FR-7.9)
- Fixed dashboard shell **1120×500** bottom-left (FR-7.10)
- Global SCSS partials for Material overrides (no `::ng-deep`)
- Node.js backend (Express + WebSocket) for REST save and real-time grid updates
- Desktop viewport layout

### Out of Scope (Current Phase)

- User authentication and authorization
- Mobile or tablet responsive layouts
- Multi-user collaboration or concurrent editing
- Full internationalization (i18n) — only a simple key-value dictionary for naming swap
- Playwright e2e **flow** test suites beyond `data-testid` wiring (`data-testid` coverage per FR-8.1 is in scope)

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
- Grid cells display **`CellValue.abbr`** (with **`CellValue.value`** on hover) — no color-coded indicators
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

The screen is a **dark-themed desktop dashboard**. Per **FR-7.10**, the live dashboard chrome is constrained to a **1120×500** region anchored **bottom-left** with compact spacing (the Stitch reference remains a general visual guide).

- **Top bar** spans the dashboard width. On the left: a "Scenario" label and dropdown. A horizontal separator line sits below the top bar.
- **Tab strip** (Frequent / Rare) sits below the top bar. Each tab renders **CMD** (Side × Wheel multi-selects) **above** the two-column split.
- **Left panel** contains the configuration controls in a single visual card (operations only — CMD is not inside this card):
  - A horizontal separator line between section headings and rows as needed
  - Tab 1: "OPR" label above 11 operations rows + CMD test rows
  - Tab 2: rare operations rows per FR-6b.1
  - Default + Cancel + Save buttons at the bottom-right of the left panel
- **Right panel** shows the **confirmed server state**:
  - Each row has a **label only** (no confirmed value) as plain text on the left, horizontally aligned with the **status grid** on the right
  - The label text is **outside** the grid — not a table column
  - The grid is a native `<table>` with column headers (L1–R4; Tab 2 also shows TTL, TTR, SSL per FR-6b.4)
  - Each cell shows **`CellValue.abbr`** (full text on hover via FR-4.6b), or is blank
  - Column hover highlights the entire column; cell click shows focus
  - On initial load, all cells are blank
  - Updates arrive only via WebSocket after a save operation
- A **vertical separator line** divides the left and right panels
- Within the **FR-7.10** shell, inner regions use compact flex layout; the overall dashboard footprint is fixed (see FR-7.2 / FR-7.7 for inner scaling trade-offs).

### Wireframe

Illustrative layout: per FR-2 / FR-7.6, **CMD spans the tab width above** the two-column split (not nested only inside the left column).

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
