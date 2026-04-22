# SYS Mode Dashboard — Specification

## Domain Context

This feature is part of a **GTA-style open-world game**. The SYS Mode dashboard is the **vehicle and mission systems control / simulation panel** within the game's custom engine — used to configure, command, and monitor vehicle subsystems in real time.

## Objective

| | |
|---|---|
| **What** | Dual-board SYS Mode dashboard for the vehicle systems simulation panel. Two boards (**Primary** — "System Commands" tab, frequently used; **Secondary** — "Failure & Antenna" tab, less frequently used) inside a tabbed wrapper with shared CMD state, per-board forms, and a real-time data grid. |
| **Why** | Control interface for configuring and monitoring vehicle subsystems (transmission, video, power, antennas, failure states) per side and wheel, with live status feedback. |
| **Who** | Game engine operators / simulation engineers. |

### Success Criteria

- Both boards render inside a tabbed wrapper at **1150×550px** per tab content area.
- **Test mode** toggle disables/enables all form controls (grid stays enabled).
- **CMD section** (side + wheel multi-select) is shared across tabs, persisted only on Apply.
- Each board POSTs to its own API endpoint.
- Grid receives data via **GET** on load, then live via a **single shared WebSocket**.
- Grid dynamically supports **8 or 11 columns** based on the active board.
- CMD + footer are **sticky**; form body **scrolls**.
- Code is modular, no NgRx, no third-party libs beyond Material, easy to migrate.

---

## Data Model

### WebSocket / GET Response

```typescript
interface SysModeResponse {
  entities: [EntityData, EntityData]; // [Left, Right]
}

interface EntityData {
  entityId: 0 | 1;                      // 0 = Left, 1 = Right
  mCommands: MCommandItem[];            // One item per form field row
  aCommands: ACommandsData;             // 5 fields → Secondary rows, last 3 columns only
  aProp1: ColumnValue;                  // Secondary, last 3 columns only
  aProp2: ColumnValue;
  aProp3: ColumnValue;
  aProp4: ColumnValue;
  aProp5: ColumnValue;
}

interface MCommandItem {
  standardFields: Record<string, ColumnValues>;
  // Keys match Primary form field names.
  // Values: one value per wheel (4 values → cols 0-3 for Left, 4-7 for Right).

  additionalFields: Record<string, ColumnValues>;
  // Keys match Secondary form field names (first 8 columns).
  // Same 4-per-side pattern.
}

type ColumnValues = [value, value, value, value]; // One per wheel (1–4)
```

For the complete list of fields, dropdown options, defaults, and grid column mappings per board, see **[field-definitions.md](./field-definitions.md)**.

### Grid Column Mapping

**Primary — 8 columns:**

| Col 0 | Col 1 | Col 2 | Col 3 | Col 4 | Col 5 | Col 6 | Col 7 |
|-------|-------|-------|-------|-------|-------|-------|-------|
| L1    | L2    | L3    | L4    | R1    | R2    | R3    | R4    |

Source: `entity[0].mCommands[*].standardFields` → cols 0–3, `entity[1].mCommands[*].standardFields` → cols 4–7.

**Secondary — 11 columns:**

| Col 0–3 | Col 4–7 | Col 8 | Col 9 | Col 10 |
|---------|---------|-------|-------|--------|
| L1–L4   | R1–R4   | TLL   | TLR   | GDL    |

- Cols 0–7: from `entity[*].mCommands[*].additionalFields` (same pattern as Primary).
- Cols 8–10: from `entity[*].aCommands` + the 5 extra props (only certain rows).

### CMD Shared State

```typescript
interface CmdSelection {
  sides: ('left' | 'right')[];   // Multi-select
  wheels: (1 | 2 | 3 | 4)[];    // Multi-select
}
```

Shared across tabs. The CMD dropdowns visually persist when switching tabs (same layout, same values). What gets lost when switching tabs without clicking Apply is the **tab-specific form field selections** — not the CMD selection itself.

### POST Payloads

Each board sends its own POST to its own endpoint:

```typescript
interface BoardPostPayload {
  sides: ('left' | 'right')[];
  wheels: number[];
  fields: Record<string, string | string[]>; // Field name → selected value(s)
}
```

The payload contains the CMD selection + all form field values (changed values merged with defaults for unchanged fields).

---

## Component Architecture

```
src/app/features/engine-sim/
├── engine-sim.module.ts                        # Feature module
├── shared/                                     # Cross-board primitives (no UI)
│   ├── engine-sim.api-contract.ts              # Wire format — what the backend dictates (response, payload, config)
│   ├── engine-sim.models.ts                    # Internal view models — what we own (CmdSelection, GridRow, FieldConfig, …)
│   ├── engine-sim.labels.ts                    # ENGINE_SIM_LABELS centralized translation map
│   ├── engine-sim.tokens.ts                    # ENGINE_SIM_API_CONFIG injection token
│   ├── option-values.ts                        # Canonical value maps + derived types (YES_NO, ON_OFF, SIDE, WHEEL, …)
│   ├── cmd-options.ts                          # CMD_SIDE_OPTIONS, CMD_WHEEL_OPTIONS (reused by both boards)
│   └── build-defaults.util.ts                  # buildDefaultValues() helper
├── boards/                                     # One folder per dashboard tab — self-contained
│   ├── primary-commands/                       # Primary — "System Commands" tab (frequently used)
│   │   ├── primary-commands.options.ts         # LabeledOption arrays (DropdownOption + required `abbr`)
│   │   ├── primary-commands.fields.ts          # FieldConfig[] + defaults builder
│   │   ├── primary-commands.columns.ts         # 8-column grid definition
│   │   └── primary-commands-form/              # Phase 5 form component (board-specific UI)
│   │       ├── primary-commands-form.component.ts
│   │       ├── primary-commands-form.component.html
│   │       └── primary-commands-form.component.scss
│   └── secondary-commands/                     # Secondary — "Failure & Antenna" tab (less frequently used)
│       ├── secondary-commands.options.ts
│       ├── secondary-commands.fields.ts
│       ├── secondary-commands.columns.ts       # 11-column grid definition (reuses Primary's 8)
│       └── secondary-commands-form/            # Phase 5 form component
│           ├── secondary-commands-form.component.ts
│           ├── secondary-commands-form.component.html
│           └── secondary-commands-form.component.scss
├── services/
│   ├── engine-sim-api.service.ts               # POST calls (one per board)
│   └── engine-sim-data.service.ts              # GET + WebSocket → Observable<EngineSimResponse>
├── utils/
│   └── grid-data.utils.ts                      # Pure functions: response → GridRow[] (per board)
└── components/                                 # Cross-board / shell-level UI
    ├── engine-sim-shell/                       # Tabs + test/live mode toggle
    │   ├── engine-sim-shell.component.ts
    │   ├── engine-sim-shell.component.html
    │   └── engine-sim-shell.component.scss
    ├── engine-sim-board/                       # Reusable layout: sticky CMD + scroll form + sticky footer
    │   ├── engine-sim-board.component.ts
    │   ├── engine-sim-board.component.html
    │   └── engine-sim-board.component.scss
    ├── cmd-section/                            # Shared CMD dropdowns (side + wheel)
    │   ├── cmd-section.component.ts
    │   ├── cmd-section.component.html
    │   └── cmd-section.component.scss
    ├── board-footer/                           # Defaults / Cancel / Apply buttons
    │   ├── board-footer.component.ts
    │   ├── board-footer.component.html
    │   └── board-footer.component.scss
    └── status-grid/                            # Right column: field labels + dynamic data grid
        ├── status-grid.component.ts
        ├── status-grid.component.html
        └── status-grid.component.scss
```

**Migration unit:** each `boards/<board>/` folder is self-contained and depends only on `shared/`. Lifting one board to another project is a folder copy + `shared/` copy.

### Component Responsibilities

| Component | Smart / Dumb | Role |
|-----------|-------------|------|
| `EngineSimShellComponent` | **Smart** | Holds `mat-tab-group`, test/live mode toggle, manages CMD shared state, owns the WebSocket subscription, passes grid data down. |
| `EngineSimBoardComponent` | **Dumb (layout)** | Two-column layout: Form (left) + Status Grid (right). Sticky CMD row at top, sticky footer at bottom, scrollable middle. Receives `disabled` from test/live mode. |
| `CmdSectionComponent` | **Dumb** | CMD row: label + two multi-dropdowns (sides, wheels). `@Input` value, `@Output` changed. |
| `BoardFooterComponent` | **Dumb** | Three buttons: Defaults, Cancel, Apply. `@Output` for defaults / cancel / apply. |
| `PrimaryCommandsFormComponent` | **Dumb** | Primary form fields (left column). All dropdowns, includes "Cmd to GS" sub-section. `@Input` formGroup + disabled. No API calls. |
| `SecondaryCommandsFormComponent` | **Dumb** | Secondary form fields (left column). Same pattern, different fields. |
| `StatusGridComponent` | **Dumb** | Right column: field labels (row headers) + dynamic data grid (8 or 11 cols). Column hover effect, cell click selection. Receives column config + row data + abbreviation mapper. White background, cell borders. No board-specific knowledge. |

### Data Flow

```
EngineSimShellComponent
  │
  ├── EngineSimDataService.connect() → Observable<EngineSimResponse>
  │     (GET on init, then WebSocket stream, same shape)
  │
  ├── cmdSelection: CmdSelection (shared across tabs, persisted on Apply)
  │
  ├── Tab 1 — Primary ("System Commands"): EngineSimBoardComponent (two-column layout)
  │     │
  │     ├── CMD row (sticky top):
  │     │     └── CmdSectionComponent  ← [selection] / (changed) →
  │     │
  │     ├── Left col:  PrimaryCommandsFormComponent  ← [formGroup] [disabled]
  │     │     (includes "Cmd to GS" sub-section — these fields excluded from grid)
  │     ├── Right col:  StatusGridComponent  ← [columns: 8] [rows] [abbrMapper]
  │     │     (row labels + grid cells, filtered from response.entities + standardFields)
  │     │
  │     └── Footer (sticky bottom):
  │           BoardFooterComponent → (defaults) (cancel) (apply)
  │              apply → EngineSimApiService.postPrimary(payload)
  │
  └── Tab 2 — Secondary ("Failure & Antenna"): EngineSimBoardComponent (two-column layout)
        │
        ├── CMD row (sticky top):
        │     └── CmdSectionComponent  ← [selection] (same saved value) / (changed) →
        │
        ├── Left col:  SecondaryCommandsFormComponent  ← [formGroup] [disabled]
        ├── Right col:  StatusGridComponent  ← [columns: 11] [rows] [abbrMapper]
        │     (row labels + grid cells, filtered from response.entities + additionalFields + aCommands)
        │
        └── Footer (sticky bottom):
              BoardFooterComponent → (defaults) (cancel) (apply)
                 apply → EngineSimApiService.postSecondary(payload)
```

---

## Layout (per tab — 1150×550px)

The layout has **two main columns**: Form (left) and Status Grid (right). The grid includes row labels (field names) as its first column, so the "status panel" is part of the grid component — not a separate column.

A **test/live mode toggle** sits at the wrapper level (above/beside the tabs). In **test mode** the forms are editable; in **live mode** the forms are disabled (read-only). The grid is always enabled regardless of mode.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  [Test / Live toggle]                                                       │
│  ┌─── Tab 1: System Commands ──┬─── Tab 2: Failure & Antenna ──┐           │
├─────────────────────────────────────────────────────────────────────────────┤
│ Cmd.  [Selected ▾▲]  [Selected ▾▲]                                         │
│ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ │
│                                                                             │
│  FORM (left)                │ STATUS GRID (right)                           │
│                              │ Label        L1  L2  L3  L4  R1  R2  R3  R4 │
│  [REDACTED]  [Not Active ▾▲] │ [REDACTED]  │   │   │   │   │ N │ N │   │  │
│  transmit    [No ▾▲]        │ transmit     │   │   │   │   │   │   │   │  │
│  Video rec   [Internal ▾]   │ Video rec    │   │   │   │   │   │ F │   │  │
│  Video Rec Type [No ▾▲]     │ Video Rec Ty │   │   │   │   │ I │ Y │   │  │
│  Mtr Rec     [No ▾▲]        │ Mtr Rec      │   │   │   │   │   │   │   │  │
│  PWR On/Off  [On ▾▲]        │ PWR On/Off   │   │   │   │   │   │   │   │  │
│  Force       [Normal ▾▲]    │ Force        │   │   │   │   │   │   │   │  │
│  [REDACTED]  [No ▾▲]        │ [REDACTED]   │   │   │   │   │   │   │   │  │
│  dump        [No ▾▲]        │ dump         │   │   │   │   │   │   │   │  │
│  Send Mtr    [No ▾▲]        │ Send Mtr     │   │   │   │   │   │   │   │  │
│  Abort       [No ▾▲]        │ Abort        │   │   │   │   │   │   │   │  │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─   │              │   │   │   │   │   │   │   │  │
│  Cmd to GS                   │  (sub-section fields excluded from grid)     │
│  Eo          [No ▾▲]        │                                               │
│  GS Mtr Rec  [No ▾▲]        │                                               │
│  Ai Mtr Rec  [No ▾▲]        │                                               │
│                              │                                               │
├──────────────────────────────┴───────────────────────────────────────────────┤
│              [Defaults]           [Cancel]              [Apply]              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Secondary layout** follows the same two-column structure, but the grid has **11 columns** (L1–L4, R1–R4, TLL, TLR, GDL) and different form fields. All form fields appear as grid rows (no sub-section exclusion on Secondary).

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Cmd.  [Selected ▾▲]  [Selected ▾▲]                                         │
│ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ │
│                                                                             │
│  FORM (left)                │ STATUS GRID (right, 11 cols)                  │
│                              │ Label           L1 L2 L3 L4 R1 R2 R3 R4 TLL TLR GDL│
│  Critical Fail   [No ▾]    │ Critical Fail   │  │  │  │  │ N│ N│  │  │   │   │   │
│  Tmp Warning Fail [Int ▾]   │ Tmp Warning F.  │  │  │  │  │  │  │  │  │   │   │   │
│  Tmp Fatal Fail  [No ▾▲]   │ Tmp Fatal Fail  │  │  │  │  │  │ F│  │  │   │   │   │
│  Critical Fail   [No ▾▲]   │ Critical Fail   │  │  │  │  │ I│ Y│  │  │   │   │   │
│  Master Fail     [On ▾▲]   │ Master Fail     │  │  │  │  │  │  │  │  │   │   │   │
│  MSLs Fail       [Normal ▾▲]│ MSLs Fail      │  │  │  │  │  │  │  │  │   │   │   │
│  Temp Fail       [No ▾▲]   │ Temp Fail       │  │  │  │  │  │  │  │  │   │   │   │
│  Comm Fail       [No ▾▲]   │ Comm Fail       │  │  │  │  │  │  │  │  │   │   │   │
│  Fail            [Normal ▾] │ Fail            │  │  │  │  │  │  │  │  │   │   │   │
│  Temp Fail       [Normal ▾] │ Temp Fail       │  │  │  │  │  │  │  │  │   │   │   │
│  Ant Select Cmd  [Auto ▾▲]  │ Ant Select Cmd  │  │  │  │  │  │  │  │  │   │   │   │
│  Ant Transmit Pwr[Normal ▾▲]│ Ant Transmit Pwr│  │  │  │  │  │  │  │  │   │   │   │
│  Transmit Pwr    [Normal ▾▲]│ Transmit Pwr    │  │  │  │  │  │  │  │  │   │   │   │
│  Ant Select      [Normal ▾▲]│ Ant Select      │  │  │  │  │  │  │  │  │   │   │   │
│                              │                                               │
├──────────────────────────────┴───────────────────────────────────────────────┤
│              [Defaults]           [Cancel]              [Apply]              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Grid Behavior

- **White background** with vertical and horizontal cell borders.
- **Column hover**: hovering over a column highlights the entire column.
- **Cell click selection**: clicking a cell visually marks it as selected.
- **Abbreviation display**: grid cells display the `abbr` (shortcut) of the value, not the full label, since cells are compact. The abbreviation mapper is defined per field in the enums.
- Each form field row on the left is **vertically aligned** with its corresponding grid row on the right.
- Primary's **"Cmd to GS" sub-section** fields are excluded from the grid — they appear only in the form.

### Key Layout Points

- **Two columns**: Form (left) + Status Grid (right, which includes row labels as its first column).
- **Test/Live toggle** at the wrapper level controls form editability.
- **Footer** has **Defaults**, **Cancel**, and **Apply**.
- The form column shows **field label + dropdown** side by side on each row.
- Primary has a sub-section **"Cmd to GS"** with its own bordered header and 3 additional fields (excluded from the grid).

---

## State Management

Following the Angular state management ladder (**no NgRx**):

| State | Where | Mechanism |
|-------|-------|-----------|
| CMD selection (unsaved draft) | `EngineSimShellComponent` | Component property |
| CMD selection (saved) | `EngineSimShellComponent` | Component property, updated on Apply |
| Primary form values | `PrimaryCommandsFormComponent` | Reactive `FormGroup` |
| Secondary form values | `SecondaryCommandsFormComponent` | Reactive `FormGroup` |
| Test/Live mode | `EngineSimShellComponent` | Component property, passed as `@Input` disabled |
| Grid data (live) | `EngineSimShellComponent` | `EngineSimDataService` Observable, piped with `async` |
| Last saved form state (for Cancel) | `EngineSimShellComponent` | Snapshot object, updated on successful Apply |

---

## Services

### `EngineSimDataService`

- Connects GET + WebSocket into a single `Observable<EngineSimResponse>`.
- GET on init → seed data.
- WebSocket → live updates (same shape), merged via `merge`.
- Single connection, shared across both boards.
- Reconnect logic on WebSocket disconnect.

### `EngineSimApiService`

- `postPrimary(payload: BoardPostPayload): Observable<void>`
- `postSecondary(payload: BoardPostPayload): Observable<void>`
- Two separate endpoints (URLs come from `ENGINE_SIM_API_CONFIG.primaryPostUrl` / `.secondaryPostUrl`), two separate methods.

**No dedicated grid service.** Column hover, cell selection, and data-to-cell mapping are UI concerns handled by `StatusGridComponent` itself (CSS for hover, component property for selection). Data transformation from the WebSocket response to grid rows is a pure function in the shell component or a utility — not a service.

---

## Option Values & Mappers

Each field's option `value` strings come from canonical `as const` maps in `shared/option-values.ts` (preferred over `enum` to avoid `const enum` build pitfalls and keep JS output minimal). Board-local option arrays attach a board-specific `abbr` (used as the grid cell text):

```typescript
// shared/option-values.ts
export const YES_NO = { No: 'no', Yes: 'yes' } as const;
export type YesNo = typeof YES_NO[keyof typeof YES_NO];

// boards/primary-commands/primary-commands.options.ts
export const YES_NO_OPTIONS: LabeledOption[] = [
  { value: YES_NO.No,  label: L.no,  abbr: 'No' },
  { value: YES_NO.Yes, label: L.yes, abbr: 'Yes' },
];
```

`LabeledOption = DropdownOption & { abbr: string }` — the required `abbr` makes "missing grid cell text" a compile error rather than a silent UX bug. `FieldConfig` is a discriminated union on `type` so `defaultValue` shape (single → `string`, multi → `string[]`) is also enforced by the compiler.

### Label Translations

**No hardcoded labels in templates.** All user-visible text (field labels, dropdown option labels, grid row labels, button text, section headers) must come from a centralized label map keyed by a constant — translation-style.

```typescript
const ENGINE_SIM_LABELS = {
  tff: 'TFF',
  mlmTransmit: 'MLM transmit',
  videoRec: 'Video rec',
  videoRecType: 'Video Rec Type',
  mtrRec: 'Mtr Rec',
  speedPwrOnOff: 'Speed PWR On/Off',
  // ...
  cmdToGs: 'Cmd to GS',
  apply: 'Apply',
  cancel: 'Cancel',
  defaults: 'Defaults',
} as const;
```

This makes migration easier (swap the map), keeps labels maintainable in one place, and prepares for future i18n if needed.

---

## Test IDs (`data-test-id`)

All interactive/selectable elements must have a `data-test-id` attribute for Playwright e2e automation. Use plain `data-test-id` attributes directly in templates (static) or `[attr.data-test-id]` (dynamic) — no directive needed.

### Naming Convention

`{area}-{element}-{identifier}`

### Required Test IDs

| Element | `data-test-id` pattern | Example |
|---------|----------------------|---------|
| CMD side dropdown | `cmd-side-select` | `cmd-side-select` |
| CMD wheel dropdown | `cmd-wheel-select` | `cmd-wheel-select` |
| Test/Live toggle | `mode-toggle` | `mode-toggle` |
| Tab | `tab-{boardKey}` | `tab-primary-commands` |
| Form dropdown | `form-{fieldKey}` | `form-tff`, `form-video-rec-type` |
| Footer buttons | `footer-{action}` | `footer-defaults`, `footer-cancel`, `footer-apply` |
| Grid cell | `grid-{fieldKey}-{colKey}` | `grid-tff-left1`, `grid-mtr-rec-right4` |
| Grid column header | `grid-header-{colKey}` | `grid-header-left1`, `grid-header-tll` |
| Grid row label | `grid-label-{fieldKey}` | `grid-label-tff`, `grid-label-abort` |

### Grid Cell Test ID Design

The grid cell test ID pattern `grid-{fieldKey}-{colKey}` enables e2e tests to:
1. Change a form field value on the left.
2. Click Apply.
3. Assert the corresponding grid cell on the right updated — by targeting `[data-test-id="grid-{fieldKey}-{colKey}"]`.

The `fieldKey` must match between the form dropdown and the grid row so automation can correlate them.

---

## Styling

- Dark navy theme consistent with existing `_dropdowns.scss`.
- Use existing spacing tokens from `_variables.scss`.
- Grid uses CSS `display: grid` with `grid-template-columns` set dynamically.
- Sticky header/footer via `position: sticky` within a flex column layout.
- No `::ng-deep`, no `!important` — global overrides follow the `_dropdowns.scss` pattern.
- Fixed container: **1150px × 550px** per tab content, but must support **resizing** — content shrinks proportionally, layout order stays the same.
- Use `%` and `fr` units inside the container, `minmax(0, 1fr)` on grid columns.
- `min-width: 0` on flex/grid children to allow shrinking below content size.
- `text-overflow: ellipsis` for labels and grid cells that may overflow.

---

## Skills

This feature uses these skills and rules:

**Skills:**
1. **[frontend-ui-engineering](../../.cursor/skills/frontend-ui-engineering/SKILL.md)** — General UI quality, accessibility, design-system adherence, AI-aesthetic avoidance.
2. **[angular-engineering](../../.cursor/skills/angular-engineering/SKILL.md)** — Angular-specific: reactive forms, RxJS patterns, change detection, content projection, services, Material theming, layout strategies, resize support.
3. **[code-simplification](../../.cursor/skills/code-simplification/SKILL.md)** — Enforce simplicity: no speculative abstractions, no over-engineering, clarity over cleverness.
4. **[code-review](../../.cursor/skills/code-review/SKILL.md)** — Multi-axis review before merge.
5. **[unit-testing](../../.cursor/skills/unit-testing/SKILL.md)** — Run and fix unit tests for changed files.

**Rules:**
- **[engineering-discipline](../../.cursor/rules/engineering-discipline.md)** — Skill discovery, scope discipline, simplicity enforcement, Angular 13 verification (`ng test` / `ng build`).
---

## Testing Strategy

| Aspect | Detail |
|--------|--------|
| **Framework** | Jasmine + Karma (project default) |
| **Location** | `.spec.ts` colocated with each component / service |
| **Services** | WebSocket connection, data mapping, POST payloads |
| **Components** | Input/Output contracts, disabled state propagation, form defaults / cancel / save |
| **Grid** | Dynamic column rendering, data mapping from response |

---

## Boundaries

| Always | Ask First | Never |
|--------|-----------|-------|
| Use `OnPush` change detection | Adding new shared components to `components/` | NgRx or state management libraries |
| Use existing `app-dropdown` / `app-multi-dropdown` | WebSocket reconnect strategy details | Third-party libs beyond Angular Material |
| Reactive forms for all form state | Exact field names/enums (define as we build each board) | `::ng-deep` or `!important` in component styles |
| Module-per-feature structure | Grid scroll behavior (sync with form or independent) | Inline styles or arbitrary pixel values |
| `trackBy` on all `*ngFor` | API endpoint URLs | Hardcoded colors outside theme tokens |
| Semantic HTML + ARIA for accessibility | | `markForCheck()` or explicit CD triggers — use `async` pipe instead |
| `data-test-id` on all interactive elements and grid cells | | Hardcoded labels in templates — use label map |
| Labels from centralized map (translation-style) | | |
---

## Commands

```bash
ng serve          # Dev server
ng build          # Build
ng test           # Test
ng lint           # Lint (if configured)
```

---

## Migration Notes

This feature will be migrated to an existing project. Keep in mind:

- **Self-contained module**: `EngineSimModule` imports everything it needs; no implicit dependencies on `AppModule`.
- **No global state**: All state lives in the feature module's components/services.
- **Reusable building blocks** (`app-dropdown`, `app-multi-dropdown`, directives) will also be migrated — keep them decoupled.
- **No project-specific assumptions**: API URLs should be configurable (environment files or injection tokens).
- The target project uses the same module-per-feature pattern and Angular 13 + Material.
