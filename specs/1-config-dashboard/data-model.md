# Data Model: Configuration Dashboard (Revised)

**Feature**: 1-config-dashboard
**Date**: 2026-04-02 (original) | 2026-04-09 (revised)

---

## Co-Location Rules

Models are co-located with their corresponding components following these rules:

1. **Component-specific models** live next to their component (e.g., `app-dropdown/app-dropdown.models.ts`)
2. **Shared dashboard models** live at the closest common parent: `config-dashboard/models/`
3. **Project-level mock data** lives in `src/app/mocks/` — not dashboard-specific

---

## Interfaces

### DropdownOption

**File**: `src/app/components/app-dropdown/app-dropdown.models.ts`

Represents a single selectable option in any dropdown. Co-located with `AppDropdownComponent`.

```typescript
export interface DropdownOption {
  value: string;
  label: string;
  abbr?: string;   // 3-letter abbreviation displayed in grid cells
}
```

### DropdownHost Interface

**File**: `src/app/components/app-dropdown/app-dropdown.models.ts`

Shared interface for `AppDropdownComponent` (single-select) and `AppMultiDropdownComponent` (multi-select). Used by `AppDropdownCvaDirective` via the `DROPDOWN_HOST` injection token.

```typescript
export interface DropdownHost<T = unknown> {
  value: T;
  disabled: boolean;
  changed: EventEmitter<T>;
}

export const DROPDOWN_HOST = new InjectionToken<DropdownHost>('DropdownHost');
```

#### AppDropdownComponent API

| Member | Type | Description |
|--------|------|-------------|
| `@Input() options` | `DropdownOption[]` | List of selectable options |
| `@Input() label` | `string` | Label displayed above the select |
| `@Input() placeholder` | `string` | Placeholder when no value selected |
| `@Input() value` | `string` | Current/initial value |
| `@Input() disabled` | `boolean` | Disables/enables the select |
| `@Input() testId` | `string` | Value for `data-testid` attribute |
| `@Output() changed` | `EventEmitter<string>` | Emits the new value on selection change |

#### AppMultiDropdownComponent API

| Member | Type | Description |
|--------|------|-------------|
| `@Input() options` | `DropdownOption[]` | List of selectable options |
| `@Input() label` | `string` | Label displayed above the select |
| `@Input() placeholder` | `string` | Placeholder when no value selected |
| `@Input() value` | `string[]` | Current/initial selected values |
| `@Input() disabled` | `boolean` | Disables/enables the select |
| `@Input() testId` | `string` | Value for `data-testid` attribute |
| `@Output() changed` | `EventEmitter<string[]>` | Emits selected values array on change |

### CmdSelection

**File**: `src/app/components/config-dashboard/components/cmd-panel/cmd-panel.models.ts`

The combined value emitted by `CmdPanelComponent`.

```typescript
export interface CmdSelection {
  sides: string[];    // e.g., ['left', 'right']
  wheels: string[];   // e.g., ['1', '2', '3', '4']
}
```

### OperationsValue

**File**: `src/app/components/config-dashboard/components/operations-list/operations-list.models.ts`

The combined value emitted by `OperationsListComponent`. Each key maps to a dropdown value.

```typescript
export interface OperationsValue {
  ttm: string;          // Not Active / Real / Captive
  weather: string;      // No / Yes
  videoRec: string;     // Internal / External
  videoType: string[];  // multi-select: No / HD / 4K / 8K
  headlights: string;   // No / Yes
  pwrOnOff: string;     // On / Off
  force: string;        // Normal / Force F / Force No
  stability: string;    // No / Yes
  cruiseCtrl: string;   // No / Yes
  plr: string;          // No / Yes
  aux: string;          // No / Yes
}
```

### DashboardState

**File**: `src/app/components/config-dashboard/models/dashboard-state.models.ts`

The complete dashboard state snapshot.

```typescript
export interface DashboardState {
  scenario: string;
  cmd: CmdSelection;
  operations: OperationsValue;
}
```

### GridConfig

**File**: `src/app/components/config-dashboard/models/grid.models.ts`

Configuration for the status grid. Defines structure (rows + columns). Passed as `@Input` to `StatusGridComponent`.

```typescript
export interface GridConfig {
  rows: GridRowDef[];
  columns: GridColumnDef[];
}

export interface GridRowDef {
  field: string;    // key matching OperationsValue property (e.g., 'row1', 'videoRec')
  label: string;    // display label (e.g., 'Video rec')
}

export interface GridColumnDef {
  id: string;       // e.g., 'L1', 'L2', 'R3'
  header: string;   // displayed in <thead> (e.g., 'L1')
}
```

### RowViewModel

**File**: `src/app/components/config-dashboard/models/grid.models.ts`

A single grid row as consumed by the template. Contains the field label and cell abbreviations.

```typescript
export interface RowViewModel {
  field: string;                    // matches GridRowDef.field
  label: string;                    // display label
  cells: Record<string, string>;   // columnId → 3-letter abbreviation (empty string = blank)
}
```

### FieldUpdate (WebSocket Message)

**File**: `src/app/components/config-dashboard/models/grid.models.ts`

A single update pushed from the server via WebSocket.

```typescript
export interface FieldUpdate {
  field: string;                    // matches GridRowDef.field (e.g., 'row1', 'videoRec')
  cells: Record<string, string>;   // columnId → abbreviation (e.g., { 'L1': 'CAP', 'L2': 'CAP' })
}
```

**Examples**:

```typescript
// User selected Left side, Wheels 1+2, changed TTM to "Captive"
{ field: "ttm", cells: { "L1": "CAP", "L2": "CAP" } }

// User selected Right side, all wheels, changed PWR to "Off"
{ field: "pwrOnOff", cells: { "R1": "OFF", "R2": "OFF", "R3": "OFF", "R4": "OFF" } }

// Full update for all wheels — Force set to Normal
{ field: "force", cells: { "L1": "NRM", "L2": "NRM", "L3": "NRM", "L4": "NRM", "R1": "NRM", "R2": "NRM", "R3": "NRM", "R4": "NRM" } }

// Multi-select: Video Type set to HD + 4K — grid cell shows comma-separated abbreviations
{ field: "videoType", cells: { "L1": "HD,4K", "L2": "HD,4K" } }
```

**Handler logic** in `StatusGridService`:

1. Find the `RowViewModel` matching `field`
2. Merge `cells` into existing row cells (only listed columns are affected; unlisted columns remain unchanged)

---

## Entity Relationships

```
DashboardState (user input state)
├── scenario: string ──────────► DropdownOption.value (from scenario options)
│   └── "Realtime" disables entire left panel
├── cmd: CmdSelection
│   ├── sides: string[] ──────► ['left'] or ['right'] or ['left','right']
│   └── wheels: string[] ─────► ['1','2','3','4'] (any combination)
│   └── Side × Wheel → grid columns (L1, L2, ..., R4)
└── operations: OperationsValue
    ├── ttm: string ───────────► 'not-active' / 'real' / 'captive'
    ├── weather: string ───────► 'no' / 'yes'
    ├── videoRec: string ──────► 'internal' / 'external'
    ├── videoType: string[] ───► multi-select: 'no' / 'hd' / '4k' / '8k'
    ├── headlights: string ────► 'no' / 'yes'
    ├── pwrOnOff: string ──────► 'on' / 'off'
    ├── force: string ─────────► 'normal' / 'force-f' / 'force-no'
    ├── stability: string ─────► 'no' / 'yes'
    ├── cruiseCtrl: string ────► 'no' / 'yes'
    ├── plr: string ───────────► 'no' / 'yes'
    └── aux: string ───────────► 'no' / 'yes'

GridConfig (static structure, @Input to grid)
├── rows: GridRowDef[]  ← one per operation (11 rows)
└── columns: GridColumnDef[]  ← computed from CMD (L1–R4) + custom

RowViewModel[] (data, @Input to grid)
├── field: string ─────────► matches GridRowDef.field
├── label: string ─────────► display label
└── cells: Record<string, string>  ← columnId → abbreviation

FieldUpdate (WebSocket message) ──updates──► RowViewModel
├── field ─────────► matches RowViewModel.field
└── cells ─────────► merges into RowViewModel.cells (partial update)

Data Flow:
  Save click → POST /api/config (DashboardState with affected wheels)
             → server processes
             → WebSocket FieldUpdate per operation
             → StatusGridService.applyUpdate() → RowViewModel[] updated
             → Grid re-renders affected cells with abbreviations

  Initial load → Grid renders empty (all cells blank)
  Default click → Left panel resets to defaults (right panel unchanged)
```

---

## Dropdown Option Configs

### CMD Options

```typescript
export const SIDE_OPTIONS: DropdownOption[] = [
  { value: 'left', label: 'Left', abbr: 'L' },
  { value: 'right', label: 'Right', abbr: 'R' },
];

export const WHEEL_OPTIONS: DropdownOption[] = [
  { value: '1', label: '1' },
  { value: '2', label: '2' },
  { value: '3', label: '3' },
  { value: '4', label: '4' },
];
```

### Operations Options (per dropdown)

```typescript
// Row 1 — TTM
export const TTM_OPTIONS: DropdownOption[] = [
  { value: 'not-active', label: 'Not Active', abbr: 'N/A' },
  { value: 'real', label: 'Real', abbr: 'REA' },
  { value: 'captive', label: 'Captive', abbr: 'CAP' },
];

// Rows 2 (Weather), 5 (Headlights), 8 (Stability), 9 (Cruise Ctrl), 10 (PLR), 11 (AUX)
export const YES_NO_OPTIONS: DropdownOption[] = [
  { value: 'no', label: 'No', abbr: 'NO' },
  { value: 'yes', label: 'Yes', abbr: 'YES' },
];

// Row 3 — Video rec
export const VIDEO_REC_OPTIONS: DropdownOption[] = [
  { value: 'internal', label: 'Internal', abbr: 'INT' },
  { value: 'external', label: 'External', abbr: 'EXT' },
];

// Row 4 — Video Type (multi-select)
// Grid cell shows comma-separated abbreviations (e.g., "HD,4K")
export const VIDEO_TYPE_OPTIONS: DropdownOption[] = [
  { value: 'no', label: 'No', abbr: 'NO' },
  { value: 'hd', label: 'HD', abbr: 'HD' },
  { value: '4k', label: '4K', abbr: '4K' },
  { value: '8k', label: '8K', abbr: '8K' },
];

// Row 6 — PWR On/Off
export const PWR_OPTIONS: DropdownOption[] = [
  { value: 'on', label: 'On', abbr: 'ON' },
  { value: 'off', label: 'Off', abbr: 'OFF' },
];

// Row 7 — Force
export const FORCE_OPTIONS: DropdownOption[] = [
  { value: 'normal', label: 'Normal', abbr: 'NRM' },
  { value: 'force-f', label: 'Force F', abbr: 'FRC' },
  { value: 'force-no', label: 'Force No', abbr: 'FNO' },
];
```

### Scenario Options

```typescript
export const SCENARIO_OPTIONS: DropdownOption[] = [
  { value: 'normal', label: 'Normal' },
  { value: 'realtime', label: 'Realtime' },
  // Additional scenarios as needed
];
```

---

## Default Values

```typescript
export const DEFAULT_CMD: CmdSelection = {
  sides: ['left'],
  wheels: ['1'],
};

export const DEFAULT_OPERATIONS: OperationsValue = {
  ttm: 'not-active',
  weather: 'no',
  videoRec: 'internal',
  videoType: ['no'],
  headlights: 'no',
  pwrOnOff: 'on',
  force: 'normal',
  stability: 'no',
  cruiseCtrl: 'no',
  plr: 'no',
  aux: 'no',
};

export const DEFAULT_DASHBOARD_STATE: DashboardState = {
  scenario: 'normal',
  cmd: DEFAULT_CMD,
  operations: DEFAULT_OPERATIONS,
};
```

---

## Grid Column Computation

Grid columns are computed dynamically from CMD dropdown options:

```typescript
function computeGridColumns(sideOptions: DropdownOption[], wheelOptions: DropdownOption[]): GridColumnDef[] {
  const columns: GridColumnDef[] = [];
  for (const side of sideOptions) {
    for (const wheel of wheelOptions) {
      const id = `${side.abbr}${wheel.value}`;  // e.g., 'L1', 'R4'
      columns.push({ id, header: id });
    }
  }
  return columns;
}

// Result for default options:
// [{ id: 'L1', header: 'L1' }, { id: 'L2', header: 'L2' }, ..., { id: 'R4', header: 'R4' }]
```

Custom columns can be appended by the consumer:

```typescript
const baseColumns = computeGridColumns(SIDE_OPTIONS, WHEEL_OPTIONS);
const customColumns = [{ id: 'custom1', header: 'C1' }];
const allColumns = [...baseColumns, ...customColumns];
```

---

## POST Payload Format

When the user clicks Save, the payload represents which wheels are being configured and what values are applied:

```typescript
// POST /api/config
{
  "scenario": "normal",
  "cmd": {
    "sides": ["left", "right"],
    "wheels": ["1", "2"]
  },
  "operations": {
    "ttm": "captive",
    "weather": "no",
    "videoRec": "internal",
    "videoType": ["no"],
    "headlights": "no",
    "pwrOnOff": "on",
    "force": "normal",
    "stability": "no",
    "cruiseCtrl": "no",
    "plr": "no",
    "aux": "no"
  }
}
```

The server uses `cmd.sides × cmd.wheels` to determine which columns to update in the WebSocket response. For example, `sides: ['left'], wheels: ['1', '2']` → server broadcasts `FieldUpdate` messages with cells for columns `L1` and `L2` only.

---

## State Transitions

### Left Panel (User Input)

```
                    ┌──────────────┐
                    │  INITIAL     │  ← loaded with DEFAULT_DASHBOARD_STATE
                    │  (clean)     │    grid empty (all cells blank)
                    └──────┬───────┘
                           │ user changes any dropdown
                           ▼
                    ┌──────────────┐
                    │  DIRTY       │  ← unsaved changes
                    │  (unsaved)   │    grid UNCHANGED
                    └──┬───┬───┬───┘
                       │   │   │
             Cancel ───┘   │   └── Default
             (revert to    │       (revert to DEFAULT,
              saved)      Save     grid UNCHANGED)
                           │
                           ▼
                    ┌──────────────┐
                    │  SAVED       │  ← POST sent; baseline updated
                    │  (clean)     │    grid still UNCHANGED (awaiting WS)
                    └──────────────┘
```

### Right Panel (Grid — WebSocket Driven)

```
                    ┌──────────────┐
                    │  EMPTY       │  ← all cells blank, labels shown
                    └──────┬───────┘
                           │ WebSocket FieldUpdate received
                           ▼
                    ┌──────────────┐
                    │  UPDATED     │  ← affected cells show abbreviations
                    └──────┬───────┘
                           │ more FieldUpdates...
                           ▼
                    ┌──────────────┐
                    │  UPDATED     │  ← each update merges independently
                    └──────────────┘

    FieldUpdate handler:
      1. Find RowViewModel by field
      2. Merge cells: for each (columnId, abbr) in update.cells:
           row.cells[columnId] = abbr
           (unlisted columns remain unchanged)
```
