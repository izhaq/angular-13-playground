# Data Model: Configuration Dashboard (Revised)

**Feature**: 1-config-dashboard
**Date**: 2026-04-02 (original) | 2026-04-09 (revised) | 2026-04-14 (tabbed dashboard + rare CMDs) | 2026-04-16 (current)

---

## Co-Location Rules

Models are co-located with their corresponding components following these rules:

1. **Component-specific models** live next to their component (e.g., `app-dropdown/app-dropdown.models.ts`) or in a `models/` subdirectory
2. **Tab-specific models** live in the tab's `models/` subdirectory (e.g., `frequent-cmds-tab/models/`, `rare-cmds-tab/models/`)
3. **Shared dashboard models** live at the closest common parent (e.g., `status-grid/models/`)
4. **Project-level mock data** lives in `src/app/mocks/` — not dashboard-specific

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

**File**: `src/app/components/dashboard-wrapper/components/cmd-panel/cmd-panel.models.ts`

The combined value emitted by `CmdPanelComponent`.

```typescript
export interface CmdSelection {
  sides: string[];    // e.g., ['left', 'right']
  wheels: string[];   // e.g., ['1', '2', '3', '4']
}
```

### FrequentOperationsModel

**File**: `src/app/components/dashboard-wrapper/components/frequent-cmds-tab/components/frequent-operations-list/frequent-operations-list.models.ts`

The combined value emitted by `FrequentOperationsListComponent`. Each key maps to a dropdown value.

```typescript
export interface FrequentOperationsModel {
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

### CmdTestModel

**File**: `src/app/components/dashboard-wrapper/components/frequent-cmds-tab/components/cmd-test-panel/cmd-test-panel.models.ts`

The combined value emitted by `CmdTestPanelComponent`. Three YES/NO toggles for CMD testing (Tab 1 only).

```typescript
export interface CmdTestModel {
  nta: string;         // 'no' / 'yes'
  tisMtrRec: string;   // 'no' / 'yes'
  rideMtrRec: string;  // 'no' / 'yes'
}
```

### DashboardState

**File**: `src/app/components/dashboard-wrapper/components/frequent-cmds-tab/models/dashboard.models.ts`

The complete dashboard state snapshot for Tab 1 (Frequent CMDs).

```typescript
export interface DashboardState {
  scenario: string;
  cmd: CmdSelection;
  operations: FrequentOperationsModel;
  cmdTest: CmdTestModel;
}

export type LeftPanelPayload = Omit<DashboardState, 'scenario' | 'cmd'>;
```

### RareOperationsModel

**File**: `src/app/components/dashboard-wrapper/components/rare-cmds-tab/components/rare-operations-list/rare-operations-list.models.ts`

The combined value for rare operations. 9 fields use Normal/Force/Ignore options; 1 field (tireCommFail) uses Yes/No.

```typescript
export interface RareOperationsModel {
  absCriticalFail: string;     // Normal / Force / Ignore
  absWarningFail: string;      // Normal / Force / Ignore
  absFatalFail: string;        // Normal / Force / Ignore
  brakeCriticalFail: string;   // Normal / Force / Ignore
  masterResetFail: string;     // Normal / Force / Ignore
  flashCriticalFail: string;   // Normal / Force / Ignore
  busTempFail: string;         // Normal / Force / Ignore
  tireCommFail: string;        // No / Yes
  fuelMapTempFail: string;     // Normal / Force / Ignore
  coolantCriticalFail: string; // Normal / Force / Ignore
}
```

### RareDashboardState

**File**: `src/app/components/dashboard-wrapper/components/rare-cmds-tab/models/rare-dashboard.models.ts`

The complete dashboard state snapshot for Tab 2 (Rare CMDs).

```typescript
export interface RareDashboardState {
  scenario: string;
  cmd: CmdSelection;
  rareOperations: RareOperationsModel;
}

export type RareLeftPanelPayload = Omit<RareDashboardState, 'scenario' | 'cmd'>;
```

### GridConfig

**File**: `src/app/components/dashboard-wrapper/components/status-grid/models/grid.models.ts`

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

### CellValue

**File**: `src/app/components/dashboard-wrapper/components/status-grid/models/grid.models.ts`

Represents a single grid cell's display value. The server resolves abbreviations server-side using `resolveAbbr`.

```typescript
export interface CellValue {
  value: string;  // full text (e.g., "Captive", "Normal")
  abbr: string;   // abbreviation displayed in the grid (e.g., "CAP", "NRM")
}
```

### RowViewModel

**File**: `src/app/components/dashboard-wrapper/components/status-grid/models/grid.models.ts`

A single grid row as consumed by the template. Contains the field label and `CellValue` objects per column.

```typescript
export interface RowViewModel {
  field: string;                       // matches GridRowDef.field
  label: string;                       // display label
  cells: Record<string, CellValue>;   // columnId → CellValue (empty = { value: '', abbr: '' })
}
```

### FieldUpdate (WebSocket Message)

**File**: `src/app/components/dashboard-wrapper/components/status-grid/models/grid.models.ts`

A single update pushed from the server via WebSocket. Cells contain `CellValue` objects with both full value and abbreviation (resolved server-side).

```typescript
export interface FieldUpdate {
  field: string;                       // matches GridRowDef.field (e.g., 'ttm', 'videoRec')
  cells: Record<string, CellValue>;   // columnId → CellValue
}
```

**Examples**:

```typescript
// User selected Left side, Wheels 1+2, changed TTM to "Captive"
{ field: "ttm", cells: { "L1": { value: "captive", abbr: "CAP" }, "L2": { value: "captive", abbr: "CAP" } } }

// User selected Right side, all wheels, changed PWR to "Off"
{ field: "pwrOnOff", cells: { "R1": { value: "off", abbr: "OFF" }, ... } }

// Multi-select: Video Type set to HD + 4K
{ field: "videoType", cells: { "L1": { value: "hd,4k", abbr: "HD,4K" }, "L2": { value: "hd,4k", abbr: "HD,4K" } } }
```

**Handler logic** in `StatusGridService`:

1. Find the `RowViewModel` matching `field`
2. Merge `cells` into existing row cells (only listed columns are affected; unlisted columns remain unchanged)

---

## Entity Relationships

```
DashboardState (Tab 1 — Frequent CMDs)
├── scenario: string ──────────► DropdownOption.value
│   └── "Realtime" disables left panel of BOTH tabs
├── cmd: CmdSelection (at tab level, NOT inside left panel)
│   ├── sides: string[] ──────► ['left'] or ['right'] or ['left','right']
│   └── wheels: string[] ─────► ['1','2','3','4'] (any combination)
│   └── Side × Wheel → grid columns (L1, L2, ..., R4)
├── operations: FrequentOperationsModel (11 fields)
│   ├── ttm, weather, videoRec, videoType, headlights
│   ├── pwrOnOff, force, stability, cruiseCtrl, plr, aux
└── cmdTest: CmdTestModel (3 fields)
    ├── nta, tisMtrRec, rideMtrRec

RareDashboardState (Tab 2 — Rare CMDs)
├── scenario: string
├── cmd: CmdSelection (at tab level, NOT inside left panel)
└── rareOperations: RareOperationsModel (10 fields)
    ├── absCriticalFail, absWarningFail, absFatalFail, brakeCriticalFail
    ├── masterResetFail, flashCriticalFail, busTempFail, tireCommFail
    └── fuelMapTempFail, coolantCriticalFail

GridConfig (static structure, @Input to grid — per tab)
├── rows: GridRowDef[]  ← Tab 1: 14 rows, Tab 2: 10 rows
└── columns: GridColumnDef[]  ← Tab 1: L1–R4 (8), Tab 2: L1–R4 + TTL, TTR, SSL (11)

RowViewModel[] (data, @Input to grid — per tab)
├── field: string ─────────► matches GridRowDef.field
├── label: string ─────────► display label
└── cells: Record<string, CellValue>  ← columnId → { value, abbr }

FieldUpdate (WebSocket message) ──updates──► RowViewModel
├── field ─────────► matches RowViewModel.field (unknown fields ignored)
└── cells: Record<string, CellValue> → merges into RowViewModel.cells (partial update)

State Management (per tab):
  TabStateService<T> + TAB_STATE_CONFIG InjectionToken
  Tab 1: TabStateService<DashboardState> → POST /api/config
  Tab 2: TabStateService<RareDashboardState> → POST /api/rare-config

Data Flow (per tab):
  Save click → TabStateService.saveConfig()
             → POST /api/config or /api/rare-config
             → server processes (processConfig or processRareConfig)
             → server resolves abbreviations (resolveAbbr) → CellValue { value, abbr }
             → WebSocket FieldUpdate per operation (broadcast to all)
             → Each tab's StatusGridService.applyUpdate()
               (ignores fields not in its row defs)
             → Grid re-renders affected cells (abbr in cell, value in hover popout)

  Initial load → Grid renders empty (all cells = { value: '', abbr: '' })
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

### Rare Operations Options

```typescript
// 9 of 10 fields use Normal/Force/Ignore
const NORMAL_FORCE_IGNORE_OPTIONS: DropdownOption[] = [
  { value: 'normal', label: 'Normal', abbr: 'NRM' },
  { value: 'force', label: 'Force', abbr: 'FRC' },
  { value: 'ignore', label: 'Ignore', abbr: 'IGN' },
];

// 1 field (tireCommFail) uses Yes/No
const YES_NO_OPTIONS: DropdownOption[] = [
  { value: 'no', label: 'No', abbr: 'NO' },
  { value: 'yes', label: 'Yes', abbr: 'YES' },
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

### Default Rare Operations

```typescript
export const DEFAULT_RARE_OPERATIONS: RareOperationsModel = {
  absCriticalFail: 'normal',
  absWarningFail: 'normal',
  absFatalFail: 'normal',
  brakeCriticalFail: 'normal',
  masterResetFail: 'normal',
  flashCriticalFail: 'normal',
  busTempFail: 'normal',
  tireCommFail: 'no',
  fuelMapTempFail: 'normal',
  coolantCriticalFail: 'normal',
};
```

---

## State Management — TabStateService\<T\>

**Files**:
- `src/app/components/dashboard-wrapper/services/tab-state.config.ts`
- `src/app/components/dashboard-wrapper/services/tab-state.service.ts`

A single generic service handles state for both tabs. Each tab provides its own configuration via the `TAB_STATE_CONFIG` InjectionToken.

```typescript
export interface TabStateConfig<T> {
  defaultState: T;
  apiUrl: string;
}

export const TAB_STATE_CONFIG = new InjectionToken<TabStateConfig<unknown>>('TabStateConfig');
```

```typescript
@Injectable()
export class TabStateService<T> {
  readonly state$: Observable<T>;
  updateState(value: T): void;
  saveConfig(value: T): void;      // POST to config.apiUrl, rollback on failure
  cancelChanges(): T;              // revert to saved baseline
  resetToDefaults(): T;            // revert to config.defaultState
  getCurrentState(): T;
  getSavedBaseline(): T;
}
```

**Tab 1 provides**: `TabStateConfig<DashboardState>` with `apiUrl: '/api/config'`
**Tab 2 provides**: `TabStateConfig<RareDashboardState>` with `apiUrl: '/api/rare-config'`

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

### Rare CMDs POST Payload

```typescript
// POST /api/rare-config
{
  "scenario": "highway-cruise",
  "cmd": {
    "sides": ["left", "right"],
    "wheels": ["1", "2"]
  },
  "rareOperations": {
    "absCriticalFail": "normal",
    "absWarningFail": "normal",
    "absFatalFail": "force",
    "brakeCriticalFail": "normal",
    "masterResetFail": "normal",
    "flashCriticalFail": "ignore",
    "busTempFail": "normal",
    "tireCommFail": "no",
    "fuelMapTempFail": "normal",
    "coolantCriticalFail": "normal"
  }
}
```

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
      2. Merge cells: for each (columnId, cellValue) in update.cells:
           row.cells[columnId] = cellValue  // { value, abbr }
           (unlisted columns remain unchanged)
```
