# Data Model: Configuration Dashboard

**Feature**: 1-config-dashboard
**Date**: 2026-04-02

---

## Co-Location Rules

Models are co-located with their corresponding components following these rules:

1. **Component-specific models** live next to their component (e.g., `app-dropdown/app-dropdown.models.ts`)
2. **Shared dashboard models** live at the closest common parent: `config-dashboard/models/`
3. **Project-level mock data** lives in `src/app/mocks/` — not dashboard-specific

This ensures the entire `components/config-dashboard/` folder (plus its child component folders) can be relocated to a different project without depending on app-level code.

## Interfaces

### DropdownOption

**File**: `src/app/components/app-dropdown/app-dropdown.models.ts`

Represents a single selectable option in any dropdown. Co-located with `AppDropdownComponent` because it's the component's primary data contract.

```typescript
export interface DropdownOption {
  value: string;
  label: string;
}
```

### DropdownHost Interface

**File**: `src/app/components/app-dropdown/app-dropdown.models.ts`

A shared interface implemented by both `AppDropdownComponent` (`app-dropdown/`, single-select) and `AppMultiDropdownComponent` (`app-multi-dropdown/`, multi-select). The `AppDropdownCvaDirective` (`app-dropdown-cva/`) uses this interface (via the `DROPDOWN_HOST` injection token) to bridge any dropdown to Angular's reactive forms. Models remain in `app-dropdown/` as the foundational contract; sibling folders import via `../app-dropdown/app-dropdown.models`.

```typescript
export interface DropdownHost {
  value: any;
  disabled: boolean;
  changed: EventEmitter<any>;
}

export const DROPDOWN_HOST = new InjectionToken<DropdownHost>('DropdownHost');
```

#### AppDropdownComponent API (Directive-Based CVA)

The component is purely presentational. CVA behavior is provided by the separate `AppDropdownCvaDirective`, which activates only when a form directive (`formControlName`, `formControl`, `ngModel`) is present on the host element.

**Standalone mode** — with `@Input`/`@Output` bindings (no form required):
```html
<app-dropdown [options]="opts" [value]="initialVal" (changed)="onChanged($event)" label="Action">
```

**Form mode** — the CVA directive activates automatically:
```html
<app-dropdown [options]="opts" formControlName="action" label="Action" placeholder="Pick...">
```

| Member | Type | Description |
|--------|------|-------------|
| `@Input() options` | `DropdownOption[]` | List of selectable options |
| `@Input() label` | `string` | Label displayed above the select |
| `@Input() placeholder` | `string` | Placeholder when no value selected |
| `@Input() value` | `string` | Current/initial value |
| `@Input() disabled` | `boolean` | Disables/enables the select |
| `@Output() changed` | `EventEmitter<string>` | Emits the new value on every selection change |

#### AppMultiDropdownComponent API

Identical to `AppDropdownComponent` but for multi-select. Uses `mat-select[multiple]`.

**Standalone mode**:
```html
<app-multi-dropdown [options]="opts" [value]="['a','b']" (changed)="onChanged($event)" label="Tags">
```

**Form mode**:
```html
<app-multi-dropdown [options]="opts" formControlName="tags" label="Tags">
```

| Member | Type | Description |
|--------|------|-------------|
| `@Input() options` | `DropdownOption[]` | List of selectable options |
| `@Input() label` | `string` | Label displayed above the select |
| `@Input() placeholder` | `string` | Placeholder when no value selected |
| `@Input() value` | `string[]` | Current/initial selected values |
| `@Input() disabled` | `boolean` | Disables/enables the select |
| `@Output() changed` | `EventEmitter<string[]>` | Emits the selected values array on change |

#### AppDropdownCvaDirective

**File**: `src/app/components/app-dropdown-cva/app-dropdown-cva.directive.ts`

A generic CVA bridge directive that works with any component providing the `DROPDOWN_HOST` token. It only activates when a form directive is present on the host element.

**Selector**: `app-dropdown[formControlName], app-dropdown[formControl], app-dropdown[ngModel], app-multi-dropdown[formControlName], app-multi-dropdown[formControl], app-multi-dropdown[ngModel]`

### CommandPair

**File**: `src/app/components/cmd-form-panel/cmd-form-panel.models.ts` (canonical source)

The combined value emitted by `CmdFormPanelComponent` via CVA. Co-located with `CmdFormPanelComponent` because it's the component's sole output type.

> **Note**: A temporary copy may exist in `config-dashboard/models/dashboard-form.models.ts` during early scaffolding. Once `cmd-form-panel.models.ts` exists, update `dashboard-form.models.ts` to import from `../../cmd-form-panel/cmd-form-panel.models` and remove the duplicate.

```typescript
export interface CommandPair {
  cmd1: string;
  cmd2: string;
}
```

### DashboardFormValue

**File**: `src/app/components/config-dashboard/models/dashboard-form.models.ts`

The complete dashboard form snapshot (action + commands + operations). Shared between `ConfigDashboardComponent`, `LeftPanelComponent` (via `@Input formValue` for the `commands` + `operations` slice), and `DashboardFormService`, so the interface lives at the closest common parent (`config-dashboard/`).

```typescript
export interface DashboardFormValue {
  action: string;
  commands: CommandPair;
  operations: string[];  // always length 10
}
```

### GridCell

**File**: `src/app/components/config-dashboard/models/grid.models.ts`

A single cell in the status grid. Each cell corresponds to one column in the grid configuration.

```typescript
export interface GridCell {
  columnId: string;    // matches GridColumn.id (e.g. 'red', 'n')
  active: boolean;     // whether this indicator is on or off
}
```

### GridRow

**File**: `src/app/components/config-dashboard/models/grid.models.ts`

A single row in the right panel. Combines the confirmed value with the status indicator cells.

```typescript
export interface GridRow {
  field: string;              // form path, e.g. "operations.0", "commands.cmd1"
  label: string;              // display label, e.g. "act 1", "cmd 1"
  confirmedValue: string;     // last saved/confirmed value from server
  cells: GridCell[];          // length matches GridColumn[] config (currently 6)
}
```

### GridColumn

**File**: `src/app/components/config-dashboard/models/grid.models.ts`

Column definition for the status grid. Used by `GridConfig` and referenced by `GridCell.columnId`.

```typescript
export interface GridColumn {
  id: string;                // 'red', 'yellow', 'green', 'n', 'p', 'l'
  label: string;             // display label or empty for color-coded
  type: 'color' | 'text';
  color?: string;            // hex color for 'color' type columns
}
```

### FieldUpdate (WebSocket Message)

**File**: `src/app/components/config-dashboard/models/grid.models.ts`

A single update pushed from the server via WebSocket. Designed flexibly so the server can send any combination of value update and/or status updates.

```typescript
export interface FieldUpdate {
  field: string;                           // form path, e.g. "operations.2", "commands.cmd1"
  value?: string;                          // new confirmed value (omit to leave unchanged)
  statuses?: Record<string, boolean>;      // partial map of columnId → active flag (omit to leave unchanged)
}
```

**Examples**:

```typescript
// Full row update — new value + all statuses replaced
{ field: "operations.2", value: "Option 2", statuses: { red: true, yellow: false, green: false, n: false, p: true, l: false } }

// Value-only update — statuses unchanged
{ field: "operations.4", value: "Option 3" }

// Single cell toggle — value unchanged
{ field: "operations.4", statuses: { p: true } }
```

**Handler logic** in `StatusGridService`:

1. Find the `GridRow` matching `field`
2. If `value` is present → update `confirmedValue`
3. If `statuses` is present → merge into existing cells (only listed columns are affected; unlisted columns remain unchanged)

### GridConfig

**File**: `src/app/components/config-dashboard/models/grid.models.ts`

Top-level configuration passed to the status grid. Defines which columns are displayed and their visual properties. Adding/removing columns requires only modifying this config object.

```typescript
export interface GridConfig {
  columns: GridColumn[];
}
```

---

## Entity Relationships

```
DashboardFormValue (live dashboard state — aggregated)
├── action: string ──────────► DropdownOption.value (from actions list)
│   └── Bound on TopBar; not part of LeftPanel FormGroup
├── commands: CommandPair ◄──── FormControl in LeftPanelComponent FormGroup
│   ├── cmd1: string ────────► DropdownOption.value (from cmd options)
│   └── cmd2: string ────────► DropdownOption.value (from cmd options)
│   └── Edited via CmdFormPanelComponent (CVA) inside LeftPanel template
└── operations: string[10] ◄── FormControl in LeftPanelComponent FormGroup
    └── each: string ────────► DropdownOption.value (from operation options)
    └── Edited via OperationsFormListComponent (CVA) inside LeftPanel template

LeftPanelComponent
├── Owns FormGroup { commands, operations } only
├── Receives @Input formValue (slice or full snapshot for sync/patch from dashboard)
└── Emits formChanged / saved / cancelled → ConfigDashboardComponent orchestrates services

GridData (right panel — confirmed server state)
├── columns: GridColumn[] ◄──── GridConfig.columns (configuration-driven)
└── rows: GridRow[]
    ├── field: string ─────────► form path (e.g. "operations.0")
    ├── label: string ─────────► display label (e.g. "act 1")
    ├── confirmedValue: string ► last server-confirmed value
    └── cells: GridCell[]
        └── matches columns by index

FieldUpdate (WebSocket message) ──updates──► GridRow
├── field ─────────► matches GridRow.field
├── value? ────────► updates GridRow.confirmedValue
└── statuses? ─────► merges into GridRow.cells (partial update by column id)

Data Flow:
  Save click → POST form → server processes → WebSocket FieldUpdate → right panel updates
  Initial load → GridData seeded from DashboardFormValue defaults (empty statuses)
```

---

## Mock Data Constants

**File**: `src/app/mocks/mock-data.ts` (project-level, not dashboard-specific)

These are project-wide mock data constants. The dashboard imports them at integration time (in the parent component), keeping the dashboard itself portable.

### Actions List
```typescript
export const ACTIONS: DropdownOption[] = [
  { value: 'action-1', label: 'Action 1' },
  { value: 'action-2', label: 'Action 2' },
  { value: 'action-3', label: 'Action 3' },
];
```

### Command Options
```typescript
export const CMD_OPTIONS: DropdownOption[] = [
  { value: 'cmd-opt-1', label: 'CMD Option 1' },
  { value: 'cmd-opt-2', label: 'CMD Option 2' },
  { value: 'cmd-opt-3', label: 'CMD Option 3' },
];
```

### Operation Options
```typescript
export const OPERATION_OPTIONS: DropdownOption[] = [
  { value: 'option-1', label: 'Option 1' },
  { value: 'option-2', label: 'Option 2' },
  { value: 'option-3', label: 'Option 3' },
  { value: 'option-4', label: 'Option 4' },
];
```

### Grid Columns
```typescript
export const GRID_COLUMNS: GridColumn[] = [
  { id: 'red',    label: '', type: 'color', color: '#ee7d77' },
  { id: 'yellow', label: '', type: 'color', color: '#f0c75e' },
  { id: 'green',  label: '', type: 'color', color: '#6ecf6e' },
  { id: 'n',      label: 'N', type: 'text' },
  { id: 'p',      label: 'P', type: 'text' },
  { id: 'l',      label: 'L', type: 'text' },
];
```

### Default Form Values

**File**: `src/app/components/config-dashboard/models/dashboard-defaults.ts` (dashboard-specific)

```typescript
export const DEFAULT_FORM_VALUE: DashboardFormValue = {
  action: 'action-1',
  commands: { cmd1: 'cmd-opt-1', cmd2: 'cmd-opt-1' },
  operations: Array(10).fill('option-1'),
};
```

### Default Grid Config

**File**: `src/app/mocks/mock-data.ts` (project-level)

```typescript
export const DEFAULT_GRID_CONFIG: GridConfig = {
  columns: GRID_COLUMNS,
};
```

### Seed Grid Rows (Initial Load)

**File**: `src/app/components/config-dashboard/models/dashboard-defaults.ts` (dashboard-specific)

A helper that builds the initial `GridRow[]` from `DEFAULT_FORM_VALUE` with all statuses inactive. Called once on service init.

```typescript
export function buildInitialGridRows(columns: GridColumn[]): GridRow[] {
  const emptyCells = (cols: GridColumn[]): GridCell[] =>
    cols.map(c => ({ columnId: c.id, active: false }));

  return Array.from({ length: 10 }, (_, i) => ({
    field: `operations.${i}`,
    label: `act ${i + 1}`,
    confirmedValue: DEFAULT_FORM_VALUE.operations[i],
    cells: emptyCells(columns),
  }));
}
```

---

## State Transitions

### Left Panel (Form State)

Reactive form state (`dirty` / `pristine` / `value`) applies to the `FormGroup` owned by **`LeftPanelComponent`** (`commands` + `operations`). `ConfigDashboardComponent` orchestrates save/cancel/reset via outputs and service baselines.

```
                    ┌──────────────┐
                    │  INITIAL     │  ← left panel FormGroup loaded with DEFAULT_FORM_VALUE slice
                    │  (pristine)  │    right panel seeded from same defaults
                    └──────┬───────┘
                           │ user changes any dropdown
                           ▼
                    ┌──────────────┐
                    │  DIRTY       │  ← form.dirty === true
                    │  (unsaved)   │    right panel UNCHANGED
                    └──┬───┬───┬───┘
                       │   │   │
              Cancel ──┘   │   └── Reset
              (revert to   │       (revert to DEFAULT)
               saved)     Save
                           │
                           ▼
                    ┌──────────────┐
                    │  SAVED       │  ← POST sent; savedBaseline updated
                    │  (pristine)  │     form.markAsPristine()
                    └──────────────┘     right panel still UNCHANGED
```

### Right Panel (Confirmed State via WebSocket)

```
                    ┌──────────────┐
                    │  SEEDED      │  ← default values, empty statuses
                    └──────┬───────┘
                           │ WebSocket FieldUpdate received
                           ▼
                    ┌──────────────┐
                    │  UPDATED     │  ← confirmedValue and/or cells merged
                    └──────┬───────┘
                           │ more WebSocket FieldUpdates...
                           ▼
                    ┌──────────────┐
                    │  UPDATED     │  ← each update merges independently
                    └──────────────┘

    FieldUpdate handler:
      1. Find row by field
      2. if value present  → row.confirmedValue = value
      3. if statuses present → for each (colId, active) in statuses:
           find cell by colId → cell.active = active
           (unlisted columns remain unchanged)
```
