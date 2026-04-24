# System Experiments Dashboard — Implementation Plan

**Feature**: system-experiments-dashboard
**Spec**: [spec.md](./spec.md)
**Field Definitions**: [field-definitions.md](./field-definitions.md)
**Date**: 2026-04-21
**Status**: Phase 1 ✅ · Phase 2 ✅ · Phase 3 ✅ · Phase 4 ✅ · Phase 5 ✅ · Phase 6 ✅ · Phase 7 pending · Phase 8 pending (shell decomposition — deferred)

---

## 1. Architecture Overview

A single self-contained feature module (`SystemExperimentsModule`) with one smart component (shell) orchestrating six dumb components. Data flows down via `@Input`, events flow up via `@Output`. No NgRx, no third-party libs beyond Material.

```mermaid
graph TD
    Shell["SystemExperimentsShellComponent (smart)"]
    DataSvc["SystemExperimentsDataService"]
    ApiSvc["SystemExperimentsApiService"]
    
    Shell -->|"subscribe"| DataSvc
    Shell -->|"POST on Apply"| ApiSvc
    
    subgraph tab1 [Tab 1 — Primary: System Commands]
        Primary["SystemExperimentsBoardComponent"]
        Cmd1["CmdSectionComponent"]
        Form1["PrimaryCommandsFormComponent"]
        Grid1["StatusGridComponent (8 cols)"]
        Footer1["BoardFooterComponent"]
        Primary --- Cmd1
        Primary --- Form1
        Primary --- Grid1
        Primary --- Footer1
    end
    
    subgraph tab2 [Tab 2 — Secondary: Failure and Antenna]
        Secondary["SystemExperimentsBoardComponent"]
        Cmd2["CmdSectionComponent"]
        Form2["SecondaryCommandsFormComponent"]
        Grid2["StatusGridComponent (11 cols)"]
        Footer2["BoardFooterComponent"]
        Secondary --- Cmd2
        Secondary --- Form2
        Secondary --- Grid2
        Secondary --- Footer2
    end
    
    Shell --- Primary
    Shell --- Secondary
    
    DataSvc -->|"GET + WebSocket"| WS["Backend"]
    ApiSvc -->|"POST primary / POST secondary"| WS
```

### Architecture Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Form strategy | Reactive Forms | Spec requires programmatic disable, reset, defaults, and snapshot/restore on cancel |
| CMD state | Component properties on shell | Simple draft + saved values — no need for a dedicated service (code-simplification) |
| Grid component | Single reusable `StatusGridComponent` | Receives dynamic column config and row data — no board-specific knowledge |
| Board layout | Content projection via `ng-content` | Board provides sticky header/body/footer shell; each tab projects its specific form |
| Service scope | Feature-scoped (`providers` in module) | Not `providedIn: 'root'` — self-contained for migration |
| API URLs | `InjectionToken` | Migration portability — no hardcoded URLs, no environment file dependency |

---

## 2. Technology Stack

Uses only what's already in the project:

| Layer | Technology | Version |
|-------|------------|---------|
| Framework | Angular | ~13.3 |
| UI Library | Angular Material | ^13.3.9 |
| Language | TypeScript | ~4.6 |
| Reactive | RxJS | ~7.5 |
| Existing components | `AppDropdownModule`, `AppMultiDropdownModule` (with CVA) | — |
| Existing styles | `_dropdowns.scss`, `_variables.scss` | — |
| New Material modules | `MatTabsModule`, `MatSlideToggleModule`, `MatButtonModule` | — |

No new dependencies.

---

## 3. File Structure

All files live under `src/app/features/system-experiments/`:

```
system-experiments/
├── system-experiments.module.ts                   # Declares all components + provides services + WS factory token
├── api/                                   # Wire-facing layer (everything network-shaped)
│   ├── api-contract.ts                    # Wire types: SystemExperimentsResponse, EntityData, MCommandItem, BoardPostPayload, SystemExperimentsApiConfig
│   ├── api-tokens.ts                      # SYSTEM_EXPERIMENTS_API_CONFIG + SYSTEM_EXPERIMENTS_WS_FACTORY injection tokens
│   ├── system-experiments-api.service.ts          # POST for each board
│   ├── system-experiments-data.service.ts         # GET + WebSocket → Observable<SystemExperimentsResponse>
│   └── grid-normalizer.ts                 # normalizeResponse() + generic buildRows() — single board-agnostic pipeline
├── shared/                                # Cross-board primitives (no UI, no wire shape)
│   ├── ids.ts                             # BOARD_IDS / COL_IDS const maps + BoardId / GridColId derived types
│   ├── models.ts                          # Free-standing view models: CmdSelection, GridColumn, GridRow, FieldConfig, LabeledOption
│   ├── labels.ts                          # SYSTEM_EXPERIMENTS_LABELS centralized translation map
│   └── option-values.ts                   # Canonical value maps + derived types (YES_NO, ON_OFF, SIDE, WHEEL, TFF, …)
├── boards/                                # One folder per dashboard tab — self-contained
│   ├── build-defaults.ts                  # buildDefaultValues() — board-construction helper over FieldConfig[]
│   ├── build-form-group.ts                # buildFormGroup() — board-construction helper over FieldConfig[]
│   ├── primary-commands/                  # Primary — "System Commands" tab (frequently used)
│   │   ├── primary-commands.options.ts    # DropdownOption arrays (with `abbr`)
│   │   ├── primary-commands.fields.ts     # PRIMARY_COMMANDS_*_FIELDS configs + buildPrimaryCommandsDefaults()
│   │   ├── primary-commands.columns.ts    # 8-column grid
│   │   └── primary-commands-form/         # Form component (11 main + 3 "Cmd to GS" fields)
│   └── secondary-commands/                # Secondary — "Failure & Antenna" tab (less frequently used)
│       ├── secondary-commands.options.ts
│       ├── secondary-commands.fields.ts   # SECONDARY_COMMANDS_*_FIELDS configs + buildSecondaryCommandsDefaults()
│       ├── secondary-commands.columns.ts  # 11-column grid (reuses Primary's 8)
│       └── secondary-commands-form/       # Form component (14 fields)
└── components/                            # Cross-board / shell-level UI
    ├── system-experiments-shell/                  # Smart: tabs, Test Mode toggle, CMD state, snapshots, grid subscription, Apply/Cancel/Defaults wiring
    ├── system-experiments-board/                  # Dumb layout: sticky CMD + scroll body + sticky footer (4 ng-content slots)
    ├── cmd-section/                       # Dumb: 2 multi-dropdowns (side, wheel) — also owns CMD_SIDE_OPTIONS / CMD_WHEEL_OPTIONS
    ├── board-footer/                      # Dumb: Defaults, Cancel, Apply buttons
    └── status-grid/                       # Dumb: dynamic grid with row labels, column hover, cell click
```

Each `boards/<board>/` folder is the **migration unit** — self-contained, depends only on `api/`, `shared/`, and the small `boards/build-*.ts` helpers. Form components live inside their board folder so the whole dashboard moves as one piece.

**One global SCSS partial supports the feature** — `src/styles/_dropdowns.scss` (Material dropdown overrides) and `src/styles/_system-experiments-shell.scss` (Material tab body sizing). Both are scoped under unique component class names so they can never leak. Loaded once from `styles.scss`.

---

## 4. Data Model

### Wire format (in `system-experiments.api-contract.ts`)

The types below cross the network boundary — they are dictated by the backend. Quarantined from the internal view models so a backend change is a one-file question.

```typescript
type EntityId = 'left' | 'right';

interface SystemExperimentsResponse {
  // Always 2 entities. entities[0] = left side, entities[1] = right side.
  entities: [EntityData, EntityData];
}

interface EntityData {
  entityId: EntityId;

  // 4 items, one per column on this side.
  // Left  entity: mCommands[0..3] → grid cols L1..L4
  // Right entity: mCommands[0..3] → grid cols R1..R4
  mCommands: [MCommandItem, MCommandItem, MCommandItem, MCommandItem];

  // Per-side TLL/TLR data.
  // Left entity → TLL column. Right entity → TLR column.
  aCommands: ACommandsData;

  // GDL column fields — flat on entity per the backend wire format
  // (no `gdl` wrapper). Side-independent — backend duplicates across both
  // entities for symmetry; the grid reads from entities[0] only.
  gdlFail: string; gdlTempFail: string;
  antTransmitPwr: string; antSelectedCmd: string;
  gdlTransmitPwr: string; uuuAntSelect: string;
}

interface MCommandItem {
  standardFields:   PrimaryStandardFields;     // 11 fields — Primary's 8-col grid rows
  additionalFields: SecondaryAdditionalFields; // 3 fields — Secondary's first 8-col rows
}

interface PrimaryStandardFields {
  tff: string; mlmTransmit: string; videoRec: string; videoRecType: string;
  mtrRec: string; speedPwrOnOff: string; forceTtl: string; nuu: string;
  muDump: string; sendMtrTss: string; abort: string;
}

interface SecondaryAdditionalFields {
  whlCriticalFail: string;
  whlWarningFail: string;
  whlFatalFail: string;
}

interface ACommandsData { // 5 fields — Secondary's TLL/TLR rows (per side)
  tlCriticalFail: string; masterTlFail: string; msTlFail: string;
  tlTempFail: string; tlToAgCommFail: string;
}

// GDL field keys — values themselves are flat on EntityData. This union
// just lets grid-data.utils.ts iterate the group without redeclaring keys.
type GdlFieldKey =
  | 'gdlFail' | 'gdlTempFail'
  | 'antTransmitPwr' | 'antSelectedCmd'
  | 'gdlTransmitPwr' | 'uuuAntSelect';
```

**Why named props over `Record<string, …>`:** every grid cell traces back to a field key the UI knows about. Naming the props lets the compiler catch wire-format drift (a typo'd backend field shows up as a TS error in `grid-data.utils.ts`, not as a blank cell discovered in QA). It's the same "types over tests" stance from Phase 1.

### Grid view models (in `system-experiments.models.ts`)

```typescript
interface GridColumn {
  id: string;    // e.g. 'left1', 'right3', 'tll'
  label: string; // e.g. 'L1', 'R3', 'TLL'
}

interface GridRow {
  fieldKey: string;                    // matches form field key
  label: string;                      // from SYSTEM_EXPERIMENTS_LABELS
  values: Record<string, string>;     // colId → abbreviation string
}
```

### Per-board configuration pattern

Each board owns its `*.options.ts`, `*.fields.ts`, and `*.columns.ts` under `boards/<board>/`. Option values come from canonical `as const` maps in `shared/option-values.ts` (so the wire format stays consistent across boards), while `abbr` (display abbreviation) and `label` (translation key) are board-local:

```typescript
// shared/option-values.ts
export const TFF = { NotActive: 'not_active', LightActive: 'light_active', Dominate: 'dominate' } as const;
export type Tff = typeof TFF[keyof typeof TFF];

// boards/primary-commands/primary-commands.options.ts
export const TFF_OPTIONS: LabeledOption[] = [
  { value: TFF.NotActive,   label: L.tffNotActive,   abbr: 'NACV' },
  { value: TFF.LightActive, label: L.tffLightActive, abbr: 'LACV' },
  { value: TFF.Dominate,    label: L.tffDominate,    abbr: 'DMN' },
];

// boards/primary-commands/primary-commands.fields.ts
export const PRIMARY_COMMANDS_MAIN_FIELDS: FieldConfig[] = [
  { key: 'tff', label: L.tff, type: 'single', options: TFF_OPTIONS, defaultValue: TFF.NotActive },
  // ...
];
```

`FieldConfig` carries no "appears in grid" metadata. Form-only fields (Primary's "Cmd to GS" sub-section) are kept in their own array (`PRIMARY_COMMANDS_CMD_TO_GS_FIELDS`) and just not passed to the grid row builder. The form renders `*_ALL_FIELDS`; the grid renders the subset with wire data behind it.

### Label map (in `system-experiments.labels.ts`)

Flat `const` object. Every user-visible string — field names, option labels, button text, section headers, grid headers — is keyed here. Templates reference `LABELS.fieldKey`, never a raw string.

---

## 5. Component Design

### `SystemExperimentsShellComponent` (Smart)

**Owns:**
- `testMode: boolean` (toggle)
- `cmdDraft: CmdSelection` (live edits to CMD dropdowns)
- `cmdSaved: CmdSelection` (persisted on Apply)
- `primaryFormGroup` and `secondaryFormGroup` (created here, passed down)
- `primarySnapshot` / `secondarySnapshot` (for Cancel — last saved state)
- `gridData$: Observable<SystemExperimentsResponse>` via `SystemExperimentsDataService`
- `primaryRows` / `secondaryRows` — precomputed from `gridData$` using pure util functions

**Key logic:**
- On Apply (from either tab): merge CMD + form values into payload, call `SystemExperimentsApiService`, snapshot form state on success
- On Cancel: `formGroup.reset(snapshot)`
- On Defaults: `formGroup.reset(DEFAULTS)`
- On tab change: no special action for CMD (it persists). Form state is lost if not applied (per spec — the `FormGroup` is per-tab but lives at shell level, so Angular handles this naturally via the tab component lifecycle)

**Template:** `mat-tab-group` with two `mat-tab`, each containing `<system-experiments-board>`. Test/live toggle is `mat-slide-toggle` above tabs.

### `SystemExperimentsBoardComponent` (Dumb Layout)

**Purpose:** Provides the sticky CMD (top) + scrollable form+grid (middle) + sticky footer (bottom) structure using flexbox.

**Inputs:** `disabled: boolean`

**Template uses `ng-content` with named slots:**
```html
<div class="board">
  <header class="board__cmd"><ng-content select="[boardCmd]"></ng-content></header>
  <div class="board__body">
    <div class="board__form"><ng-content select="[boardForm]"></ng-content></div>
    <div class="board__grid"><ng-content select="[boardGrid]"></ng-content></div>
  </div>
  <footer class="board__footer"><ng-content select="[boardFooter]"></ng-content></footer>
</div>
```

**SCSS:** Flex column, `height: 100%`, `overflow: hidden` on host. Header/footer `flex-shrink: 0`. Body `flex: 1; overflow-y: auto; display: flex` (form left + grid right). Uses `%` widths internally for resize support.

### `CmdSectionComponent` (Dumb)

**Inputs:** `selection: CmdSelection`, `disabled: boolean`
**Outputs:** `selectionChange: EventEmitter<CmdSelection>`

Two `app-multi-dropdown` instances (Side and Wheel) bound via CVA `formControlName` to an internal `FormGroup` that emits on `valueChanges`. Labels from `LABELS.cmdSide` / `LABELS.cmdWheel`.

### `BoardFooterComponent` (Dumb)

**Outputs:** `defaults`, `cancel`, `apply` (all `EventEmitter<void>`)

Three `mat-button` elements. Takes `@Input() boardId: BoardId` and stamps `[attr.data-test-id]="'footer-' + boardId + '-' + action"` on each button (e.g. `footer-primary-apply`). Labels from `LABELS`.

### `PrimaryCommandsFormComponent` (Dumb — Primary)

**Inputs:** `formGroup: FormGroup`, `disabled: boolean`
**No outputs** — parent reads `formGroup.getRawValue()` directly.

Iterates `PRIMARY_COMMANDS_MAIN_FIELDS` config to render 11 dropdowns using `app-dropdown` / `app-multi-dropdown` with `formControlName`. Below the main fields, a bordered "Cmd to GS" section with 3 more dropdowns (`PRIMARY_COMMANDS_CMD_TO_GS_FIELDS`). Each dropdown gets `[attr.data-test-id]="'form-' + BOARD_IDS.primary + '-' + field.key"` (Secondary form uses `BOARD_IDS.secondary` — the board id is hard-coded per form, not threaded through as an input, since each form component owns exactly one board).

When `disabled` changes: `formGroup.disable()` / `formGroup.enable()`.

### `SecondaryCommandsFormComponent` (Dumb — Secondary)

Same pattern, 14 fields from `SECONDARY_COMMANDS_ALL_FIELDS` (composed of `SECONDARY_COMMANDS_8COL_FIELDS` + `SECONDARY_COMMANDS_TLL_TLR_FIELDS` + `SECONDARY_COMMANDS_GDL_FIELDS`). No sub-sections. All fields render as grid rows.

### `StatusGridComponent` (Dumb)

**Inputs:**
- `columns: GridColumn[]` (8 or 11)
- `rows: GridRow[]`
- `fieldKeys: string[]` (ordered list of field keys this board shows)

**Template:** CSS Grid with `[style.grid-template-columns]="gridTemplateColumns"` precomputed in `ngOnChanges`. First column is row labels, rest are data cells.

**Behavior:**
- Column hover: CSS column class toggled via `mouseenter`/`mouseleave` on cells (stores `hoveredColId`)
- Cell click: stores `selectedCellId` (fieldKey + colId composite)
- Abbreviations: `row.values[col.id]` directly renders the abbr string
- Test IDs: `[attr.data-test-id]="'grid-' + boardId + '-' + row.fieldKey + '-' + col.id"` on each cell, plus `grid-header-{boardId}-{colId}` on column headers and `grid-label-{boardId}-{fieldKey}` on row labels. `boardId: BoardId` is an `@Input` on `StatusGridComponent`.

**SCSS:** White background, `1px solid` borders on cells, highlight class for hovered column, selected cell border. `text-overflow: ellipsis` on cells.

---

## 6. Services

### `SystemExperimentsDataService`

```typescript
connect(): Observable<SystemExperimentsResponse>
```

- Calls GET once on subscribe (seed data)
- Opens WebSocket and merges live updates via `merge(get$, ws$)`
- WebSocket wrapped in Observable with `share()` and `retry({ delay: 3000 })` for reconnect
- Single connection shared across both tabs (called once in shell `ngOnInit`)

### `SystemExperimentsApiService`

```typescript
postPrimary(payload: BoardPostPayload): Observable<void>
postSecondary(payload: BoardPostPayload): Observable<void>
```

- Two POST endpoints (URLs from `SYSTEM_EXPERIMENTS_API_CONFIG.primaryPostUrl` / `.secondaryPostUrl`), injected via `SYSTEM_EXPERIMENTS_API_CONFIG` token for migration portability

---

## 7. Grid Data Transformation (`grid-data.utils.ts`)

Two-step pipeline. Pure functions, no service:

```typescript
function normalizeResponse(response: SystemExperimentsResponse): FlatGrid;
function buildRows(fields: FieldConfig[], grid: FlatGrid, columns: GridColumn[]): GridRow[];
```

- **`normalizeResponse`** is the only place that knows the wire shape. It flattens `entities[*].mCommands[i].standardFields|additionalFields`, `aCommands`, and the flat GDL props into a column-keyed `FlatGrid` (`Partial<Record<GridColId, Record<fieldKey, rawValue>>>`).
- **`buildRows`** is fully generic — same function for both boards. For each `(field, column)` pair, looks up the raw value in the grid and renders its abbreviation. Caller controls which fields appear: pass `PRIMARY_COMMANDS_MAIN_FIELDS` (excludes "Cmd to GS") for the Primary grid; pass `SECONDARY_COMMANDS_ALL_FIELDS` for Secondary.

Cell rendering rule (`abbrFor`): missing/empty → `''`; known value → its `abbr`; unknown but present → first 3 chars of the raw value (so QA can spot wire drift instead of staring at silent empty cells).

Called in `SystemExperimentsShellComponent` whenever `gridData$` emits — once per frame, then both boards' rows derived from the same `FlatGrid`.

---

## 8. State Management Summary

| State | Where | Mechanism |
|-------|-------|-----------|
| CMD draft | `SystemExperimentsShellComponent.cmdDraft` | Local property, updated on `CmdSectionComponent` output |
| CMD saved | `SystemExperimentsShellComponent.cmdSaved` | Updated on Apply |
| Form state (Primary) | `FormGroup` created in shell | Passed to `PrimaryCommandsFormComponent` |
| Form state (Secondary) | `FormGroup` created in shell | Passed to `SecondaryCommandsFormComponent` |
| Form snapshots | Plain objects | For Cancel restore |
| Test/Live mode | Shell boolean | Passed as `disabled` input |
| Grid data | `async` pipe on `gridData$` | From `SystemExperimentsDataService` |
| Grid rows | Precomputed in shell | From `gridData$` emissions |

No shared services for state. No BehaviorSubjects. All state is component-local in the shell.

---

## 9. Styling Strategy

- Reuse existing `_dropdowns.scss` global overrides (same dropdown look)
- Add new `_system-experiments.scss` partial for dashboard-specific styles (imported in `styles.scss`)
- Grid uses CSS Grid (not `<table>`) with dynamic `grid-template-columns`
- Sticky layout via flexbox (matching the angular-engineering skill pattern)
- Container: parent provides `1150px x 550px`; internals use `%` and `fr` for resize
- Column hover: JS-driven class toggle (CSS `:has()` not reliable in Angular 13 target browsers)
- Theme tokens from `_variables.scss` for spacing
- No `::ng-deep`, no `!important`

---

## 10. Implementation Phases

### Testing Approach (applies to every phase)

Test-after, not strict TDD — the spec is stable enough that tests document what's built rather than drive design. But each phase ships with tests in the same change-set; no phase is "done" until its tests are green.

**Types over tests** — push invariants into the type system whenever possible, then skip the corresponding runtime test. A test for static configuration is a smell; the right tool is a tighter type. Examples already shipped in Phase 1: `FieldConfig` is a discriminated union on `type` (so single fields can't have an array default and vice versa), and `LabeledOption` requires `abbr` (so a board option can't render a blank grid cell).

**What we test** — pure functions, observable contracts, dumb-component input/output behavior, and one happy-path integration spec for the shell.

**What we don't test** — Angular Material internals, CSS layout (visual QA covers that), private methods, snapshot tests of templates, **the shape of static configuration arrays** (the types do that).

**Test file convention** — `<file>.spec.ts` colocated next to source. Jasmine + Karma + ChromeHeadless (existing setup).

### Phase 1: Models, Labels, Per-Board Configuration (XS-S) — ✅ Complete

Foundation layer — no components, no services. Just TypeScript.

- `shared/system-experiments.api-contract.ts` — wire-format types (response, payload, config) with named props per board (`PrimaryStandardFields`, `SecondaryAdditionalFields`, `ACommandsData`, `GdlFieldKey`)
- `shared/system-experiments.models.ts` — internal view models (CmdSelection, GridColumn, GridRow, FieldConfig)
- `shared/system-experiments.labels.ts` — centralized translation map
- `shared/system-experiments.tokens.ts` — `SYSTEM_EXPERIMENTS_API_CONFIG` injection token
- `shared/option-values.ts` — canonical `as const` value maps + derived literal-union types
- `shared/cmd-options.ts` — `CMD_SIDE_OPTIONS`, `CMD_WHEEL_OPTIONS`
- `shared/build-defaults.util.ts` — `buildDefaultValues()` helper
- `boards/primary-commands/{options,fields,columns}.ts` — Primary's 14 fields (11 main + 3 "Cmd to GS")
- `boards/secondary-commands/{options,fields,columns}.ts` — Secondary's 14 fields (3 `additionalFields` + 5 `aCommands` + 6 `gdl`)
- `system-experiments.module.ts` — empty shell module

**Acceptance criteria:** `ng build` passes. All types/configs importable.

**Tests delivered (6 specs, all green):**
- `shared/build-defaults.util.spec.ts` — pure utility: array cloning, fresh-object-per-call, mixed single/multi defaults

**Invariants enforced by types (no runtime test needed):**
- `FieldConfig = SingleSelectField | MultiSelectField` — narrowing on the `type` literal forces `defaultValue: string` on single fields and `defaultValue: string[]` on multi fields. A wrong-shape default fails compile.
- `LabeledOption = DropdownOption & { abbr: string }` — every option array used by a field is typed as `LabeledOption[]`, so a missing `abbr` (which would render a blank grid cell) fails compile.
- `GridColId` (in `shared/column-ids.ts`) — every grid column id is a member of one literal-union derived from `COL_IDS`. Typos in column references fail compile.
- Option `value`s come from canonical `as const` maps in `option-values.ts`, exported as derived literal-union types — drift between boards fails compile.

### Phase 2: Services (S) — ✅ Complete

- `shared/column-ids.ts` — `COL_IDS` const + `GridColId` literal-union (single source for column ids)
- `utils/grid-data.utils.ts` — two-step pipeline: `normalizeResponse` (wire-aware) + generic `buildRows` (board-agnostic)
- `services/system-experiments-api.service.ts` — `postPrimary` / `postSecondary`
- `services/system-experiments-data.service.ts` — `connect()`: GET seed → WS stream, auto-reconnect, multicast
- `shared/system-experiments.tokens.ts` — added `SYSTEM_EXPERIMENTS_WS_FACTORY` token + `SystemExperimentsWebSocketFactory` type so tests can swap in a fake socket
- `system-experiments.module.ts` — provides both services + the default `webSocket()`-backed factory; imports `HttpClientModule`

**Acceptance criteria:** Services injectable. `normalizeResponse` + `buildRows` produce correct `GridRow[]` from mock response data. `ng test` passes (49/49 green).

**Tests delivered (18 specs, all green):**
- `utils/grid-data.utils.spec.ts` (11)
  - `normalizeResponse` (5): routes `left.mCommands[i]` (standard + additional merged) → `left{i+1}`; same for right; `left.aCommands` → `tll`, `right.aCommands` → `tlr`; left entity flat GDL props → `gdl` (right entity duplicate ignored); `entityId` / `mCommands` / `aCommands` never leak into the gdl cell.
  - `buildRows` (6): emits one row per field in given order; per-field abbreviation lookup per column; missing wire values render empty; **unknown values fall back to first 3 chars of the raw value** (so wire drift is visible to QA, not silently swallowed); only writes to columns it is given (Primary 8 vs Secondary 11); fields not passed in are absent from the rows (form-only fields are filtered by *not* passing them, no metadata flag).
- `services/system-experiments-api.service.spec.ts` (3) — `postPrimary` / `postSecondary` POST to the URLs from the injected `SYSTEM_EXPERIMENTS_API_CONFIG` token with the exact `BoardPostPayload` body; no network call until subscribe.
- `services/system-experiments-data.service.spec.ts` (4) — emits GET seed first, then merges WS frames; opens the WS once per stream against `wsUrl`; reconnects after WS error with a 3 s delay (verified via `fakeAsync` + `tick`); multiple subscribers share one upstream connection.

**Design notes:**
- `SystemExperimentsDataService` uses `concat(get$, ws$)` (not `merge`) so a stale WS frame never beats the GET seed onto the screen; `defer` + `retry({ delay })` makes the WS factory re-invoke on every reconnect; `shareReplay({ bufferSize: 1, refCount: true })` keeps the connection single while letting late subscribers see the latest frame.
- The 3 s reconnect delay is a private static constant; if it ever needs to be configurable, lift it to `SystemExperimentsApiConfig`.
- **Grid pipeline split**: `normalizeResponse` is the only place that knows the wire shape. `buildRows` is fully generic — same function for both boards, no per-board variants, no `gridColGroup` routing flag on `FieldConfig`. To exclude a field from the grid (e.g. Primary's "Cmd to GS"), the shell just doesn't pass it to `buildRows`. This shrank the utility from ~120 LoC of board-specific helpers to ~70 LoC of one wire mapper + one row builder, and removed `GridColGroup` from the type system.
- `abbrFor` falls back to `value.slice(0, 3)` when the wire value isn't a known option — surfaces backend drift in the UI instead of rendering blank cells QA can't distinguish from "no data".
- `column-ids.ts` is the single source for column ids — both `*.columns.ts` files and `normalizeResponse` import from it, so renaming a column id is a one-line change.
- `SYSTEM_EXPERIMENTS_API_CONFIG` is intentionally NOT provided by `SystemExperimentsModule` — the host project supplies its own URLs at module-setup time, keeping the feature URL-agnostic for migration.

### Phase 3: Dumb Components — Grid + Footer + CMD (S-M) — ✅ Complete

Build the three reusable dumb components that have no board-specific knowledge:

- `StatusGridComponent` — dynamic columns, row labels, column hover, cell click, test IDs
- `BoardFooterComponent` — 3 buttons with outputs and test IDs
- `CmdSectionComponent` — 2 multi-dropdowns with shared selection model

All three are OnPush, declared and exported by `SystemExperimentsModule`, and live under `features/system-experiments/components/<name>/`.

**Acceptance criteria:** Each component renders in isolation with mock inputs. Test IDs present. Column hover works. `ng test` passes.

**Tests delivered (18 specs, all green):**
- `board-footer.component.spec.ts` (5 specs) — three namespaced buttons render; centralized labels; per-button output emission; `disabled` flag disables all buttons; boardId namespacing produces unique secondary ids
- `cmd-section.component.spec.ts` (6 specs) — Side and Wheel dropdowns rendered with stable test ids; `selection` seeds initial value; `selectionChange` merges new sides with existing wheels and vice versa; `disabled` propagates to both dropdowns
- `status-grid.component.spec.ts` (7 specs) — `gridTemplateColumns` precomputed in `ngOnInit` as `minmax(var(--grid-label-col-min), max-content) repeat(N, minmax(var(--grid-data-col-min), 1fr))`; column headers, row labels, and cells get namespaced ids; cell text equals `row.values[col.id]`; `mouseenter`/`mouseleave` toggle `hoveredColId`; cell click sets `selectedCellId="{fieldKey}|{colId}"`; boardId namespacing carries through every test-id prefix

**Notes from Phase 3 implementation:**
- All three component specs use a host wrapper component (not direct property mutation). Setting `@Input()`s straight on the OnPush child does not dirty its view and does not propagate down through bindings — `[disabled]` would not flow to children, and any `ngOnChanges`-derived view state would never recompute. The wrapper makes inputs flow through Angular's binding system, matching how the shell will wire them in Phases 5–6.
- `StatusGridComponent` writes `gridTemplateColumns` from `ngOnInit` (not a getter, not `ngOnChanges`) — `columns` is a set-once input per board, and a getter would recompute on every change-detection tick. The doc comment flags `ngOnChanges` as the escape hatch if `columns` ever becomes reactive (e.g. dynamic column toggles).
- `[style.grid-template-columns]` requires the kebab-case binding name; the component property stays `gridTemplateColumns` (camelCase) per Angular's style binding convention.
- No `markForCheck()` anywhere — `(click)` and `(mouseenter)`/`(mouseleave)` already trigger CD for OnPush components since they fire inside the Angular zone.

**Follow-up cleanup (post-Phase 3 review):**
- Centralized colors and layout-impacting sizing into `src/app/features/system-experiments/styles/_system-experiments-tokens.scss`. All three component SCSS files import it via `@import 'system-experiments-tokens';` — the flat path is resolved through `stylePreprocessorOptions.includePaths` in `angular.json` (added to both `build` and `test` targets). When migrating the feature, the host project's `angular.json` needs the same `includePaths` entry pointing at `src/app/features/system-experiments/styles`.
- Sizing tokens are tuned for the 1150×550 shell envelope: `$grid-label-col-min: 90px`, `$grid-data-col-min: 44px` (down from 120/56). Math: 11 cols × 44 + 90 = 574px, fits a ~640px right pane without horizontal scroll. Retune in `_system-experiments-tokens.scss` if the host gives us a different envelope.
- `StatusGridComponent` re-exports the SCSS sizing tokens as CSS custom properties on `:host` (`--grid-label-col-min`, `--grid-data-col-min`). The TS-built `gridTemplateColumns` string references them via `var(--…)` so SCSS stays the single source of truth — changing the sizing budget is a one-line edit in the tokens partial, no TS change required. **Caveat:** if a future edit moves the `--grid-…` declarations off `:host`, the TS template silently falls back to CSS Grid defaults. A pixel-width regression test would catch this; deferred until needed.
- `readonly` audit applied: `@Output()` emitters, injected services (`private readonly`), instance constants (`labels`, options), and `trackBy` arrow functions are all `readonly`. `@Input()` properties intentionally are **not** marked readonly — Angular rebinds them, so the modifier would mislead. Mutable view state (`hoveredColId`, `selectedCellId`, `gridTemplateColumns`) is not readonly because it's reassigned at runtime.

### Phase 4: Board Layout Component (S) — ✅ Complete

- `SystemExperimentsBoardComponent` — sticky header/footer layout with `ng-content` slots
- SCSS for the two-column (form + grid) split, sticky behavior, scroll

**Acceptance criteria:** Content projection works. Sticky header/footer verified. Resize shrinks proportionally.

**Tests delivered (6 specs, all green):**
- `system-experiments-board.component.spec.ts` — four structural slot containers render (`__cmd`, `__form`, `__grid`, `__footer`); each marker (`[boardCmd]`, `[boardForm]`, `[boardGrid]`, `[boardFooter]`) projects into the matching container; form + grid live inside the scrollable body container while cmd + footer do not (containment assertion — couples the spec to the layout contract, not specific CSS values)

**Notes from Phase 4 implementation:**
- Zero inputs, zero outputs, zero logic. The board is pure layout: 4 `ng-content` slots wrapped in flex/grid containers. The shell wires data and events directly to the projected children — `[disabled]` flows from shell to `<primary-commands-form [disabled]="…" boardForm>`, not through the board. Spec table mention of "Receives `disabled` from test/live mode" describes data flow, not a literal `@Input` on the board.
- "Sticky" behavior is implemented via flex-column layout (cmd + footer = `flex: 0 0 auto`, body = `flex: 1 1 auto` with `overflow` on its grid children) rather than `position: sticky`. Cleaner: no stacking-context games, no scroll-container assumptions, no need for the parent to be the scroll root. The user-visible behavior (cmd row pinned at top, footer pinned at bottom, middle scrolls) is identical.
- Form / grid horizontal split is **4 : 6** — gives the 11-column secondary grid the ~640px pane it needs (90 + 11 × 44 = 574px minimum), leaving ~460px for form rows. Documented as a token at the top of the SCSS so it's tunable in one place.
- `min-height: 0` on the body and `min-width: 0` / `min-height: 0` on form/grid columns are critical — without them, flex/grid children refuse to shrink below their intrinsic content size and the layout overflows on narrow shells. Comments in the SCSS explain why each one is needed.
- Slot markers use plain attribute selectors (`[boardCmd]`, `[boardForm]`, `[boardGrid]`, `[boardFooter]`) so consumers can attach them to any element or component without coupling the layout to a specific child class. CamelCase chosen to match the rest of Angular's directive / projection conventions.

### Phase 5: Form Components (M) — ✅ Complete

- `PrimaryCommandsFormComponent` (under `boards/primary-commands/primary-commands-form/`) — 11 main fields + 3 "Cmd to GS" fields, all from config arrays
- `SecondaryCommandsFormComponent` (under `boards/secondary-commands/secondary-commands-form/`) — 14 fields

Both consume `FormGroup` + `disabled` as inputs. All dropdowns use `formControlName` (CVA via `AppDropdownCvaDirective`).

**Acceptance criteria:** Forms render all fields with correct options and defaults. Disable/enable toggles all controls. Test IDs on every dropdown. `ng test` passes.

**Tests delivered (12 specs total, all green):**
- `primary-commands-form.component.spec.ts` (6 specs) — one dropdown per field in `PRIMARY_COMMANDS_ALL_FIELDS` (with total-count sanity); "Cmd to GS" sub-section header + its three fields render; multi vs single fields render via the right dropdown component (`app-multi-dropdown` vs `app-dropdown`); FormGroup seeded to per-field defaults; `[disabled]=true` disables the whole FormGroup and every control; flipping back re-enables it
- `secondary-commands-form.component.spec.ts` (6 specs) — same shape for `SECONDARY_COMMANDS_ALL_FIELDS`, plus an explicit "no sub-section header" assertion since the secondary form is intentionally flat

**Notes from Phase 5 implementation:**
- **`buildFormGroup(fields)` util added in `shared/build-form-group.util.ts`** — takes a `FieldConfig[]` and returns a `FormGroup` with one `FormControl` per field, seeded to the field's `defaultValue`. Used by both form specs and (in Phase 6) the shell when it constructs each board's reactive form. Keeping the helper in one place means the wire-up is identical in tests and production — the shell can never build a different shape than the form expects to render.
- **Row markup is inlined in both ngFor blocks** (Primary's main + cmd-to-gs sections) rather than extracted to an `<ng-template>` rendered via `*ngTemplateOutlet`. Reason: embedded views created via `*ngTemplateOutlet` don't inherit the parent `formGroup` directive's DI scope, so `formControlName` falls back to "no parent formGroup" and throws at runtime. The duplication is small (~20 lines) and the simplicity is worth more than the DRY win.
- **Section header test ids use a different prefix (`section-{boardId}-{name}`) from field test ids (`form-{boardId}-{fieldKey}`)** so a `[data-test-id^="form-{boardId}-"]` selector counts only field dropdowns. Originally tried `form-primary-cmd-to-gs-header` and the count assertion silently included it — caught by the spec on the first red, fixed by renaming.
- **Form components own enable/disable on the FormGroup** via `ngOnChanges` watching either `disabled` or `formGroup` input changes. Uses `{ emitEvent: false }` because toggling test/live mode is a UI concern, not a value change — downstream `valueChanges` subscribers should not see a phantom event when the user flips the mode toggle.
- **Each row uses CSS Grid (`label-col + minmax(0, 1fr) control-col`)** so the control side can shrink with the form pane on narrow shells. `min-width: 0` on the control wrapper is the must-have — without it, `mat-form-field`'s intrinsic width pushes past the pane and breaks the layout.
- **Primary's "Cmd to GS" sub-header** uses a boxed pill style that mirrors the cmd-section title — both are bordered with `currentColor` + `$control-radius` from the shared tokens partial, so they read as one visual family.
- **`disabled` input intentionally lives on the form component, not on the board layout.** The shell wires the `[disabled]` directly: `<system-experiments-primary-commands-form [disabled]="!testMode" boardForm>`. The board (Phase 4) is pure layout and doesn't pass anything through.
- **Demo page wired with both standalone form previews + a real Primary form inside the full board layout** (replacing the Phase 4 form stub). Each standalone preview has a "Toggle disabled" button so the test/live mode behavior is observable end-to-end.

### Phase 6: Shell Component — Integration (M-L) — ✅ Complete

- `SystemExperimentsShellComponent` — smart orchestrator: tabs, Test Mode toggle, CMD state, both form groups, snapshots, grid data subscription, Apply/Cancel/Defaults wiring
- `MatTabsModule` + `MatSlideToggleModule` added to `SystemExperimentsModule`; shell declared and exported

**Acceptance criteria:** ✅ `ng test` 96/96 green · `ng build` clean (no warnings, no errors) · full demo dashboard renders with mock data + console-logged Apply.

**Tests delivered (12 specs, all green):**
- `system-experiments-shell.component.spec.ts` — initial state (testMode on, forms enabled, CMD empty); both form groups seeded with their canonical defaults; Apply on Primary calls `postPrimary` with `{ sides, wheels, fields }` (full form snapshot, not just edits); Apply on Secondary calls `postSecondary`, not `postPrimary`; Apply commits both the form snapshot and `cmdDraft → cmdSaved` on success (verified via subsequent Cancel reverting to the just-applied state); Cancel restores form to snapshot; Defaults resets to `buildPrimaryCommandsDefaults()` independent of snapshot; tab switch preserves `cmdSaved` and `cmdDraft` (CMD is shared); tab switch discards unapplied form edits on the leaving tab; test-mode-off disables both form groups + CMD; test-mode-on re-enables them. Uses TestBed-provided `SystemExperimentsApiService` spy and a stubbed `SystemExperimentsDataService.connect()` that returns a manual `Subject` so frame timing is deterministic.

**Notes from Phase 6 implementation:**
- **CMD draft and saved are separate properties on the shell.** Apply commits `cmdDraft → cmdSaved` *after* the POST resolves. Cancel does NOT revert `cmdDraft` — CMD is shared across tabs, so per-tab Cancel only owns the tab's form. To revert CMD, the user re-selects (or future iteration can add a CMD-specific revert affordance if the spec asks for it).
- **Spec interpretation:** "switching tabs preserves cmdSaved but not unapplied form edits" — the shell preserves *both* `cmdSaved` and `cmdDraft` across tabs (per spec.md: "shared across tabs… what gets lost when switching tabs without clicking Apply is the tab-specific form field selections — not the CMD selection itself"). Only the leaving tab's form is reset to its snapshot via `formGroup.reset(snapshot, { emitEvent: false })`.
- **`emitEvent: false` on every reset/disable/enable.** Test-mode toggling and Cancel/Defaults are UI affordances, not value changes — downstream `valueChanges` subscribers (none today, cheap insurance for tomorrow) should not see phantom edit cycles.
- **Apply payload uses `formGroup.getRawValue()`.** That already merges per-field defaults with edits — `getRawValue()` returns every control's current value regardless of disabled state. No explicit `{ ...defaults, ...edits }` merge in the shell.
- **Grid stream subscribed once in `ngOnInit`, normalized + built once per emission, with both boards' rows derived from the same `FlatGrid`.** `takeUntil(destroy$)` for unsubscribe; `cdr.markForCheck()` because OnPush + async assignment.
- **Test Mode disables CMD + both forms; the grid stays alive.** Footer buttons are bound to `[disabled]="!testMode"` (so Apply/Cancel/Defaults can't fire while controls are read-only). The Test Mode toggle itself stays interactive.
- **Mat Tabs styling needs to fill height** (so the projected `<system-experiments-board>` can run its own flex layout against a real height). Material's `.mat-tab-body-wrapper` sits behind the shell's encapsulation boundary, and the project rule is no `::ng-deep` — handled by adding `src/styles/_system-experiments-shell.scss` (a tiny global partial scoped under `.system-experiments-shell`, same pattern as `_dropdowns.scss`). Imported once in `styles.scss`.
- **Demo wiring (`src/app/demo/system-experiments-demo.providers.ts`):** stubs `SystemExperimentsDataService` and `SystemExperimentsApiService` for the playground so the shell renders a canned `SystemExperimentsResponse` and Apply logs to the console instead of POSTing. `DemoPageModule` providers override `SystemExperimentsModule`'s real services via Angular's last-provider-wins rule for eager modules. The host project for the migration target is expected to provide its own `SYSTEM_EXPERIMENTS_API_CONFIG` and use the real services.
- **Build budgets bumped** in `angular.json` (`initial: 500kb → 600kb`, `anyComponentStyle: 2kb → 3kb`) to absorb `MatTabsModule` + `MatSlideToggleModule` and the slightly larger demo SCSS. Both are compatible with the migration target — bundle still well under the 1 MB error ceiling.

### Phase 7: Polish and Verify (S)

- Visual QA — layout, spacing, alignment, sticky behavior
- Resize testing — shrink container, verify proportional behavior
- All `data-test-id` attributes verified
- Full test suite green
- Production build clean

**Tests:** No new tests — this phase is verification only. Confirm `ng test --no-watch --browsers=ChromeHeadless` and `ng build` are both clean.

### Phase 8: Shell Decomposition — Per-Board Controllers (M) — pending

`SystemExperimentsShellComponent` accreted multiple responsibilities by Phase 6:

| Concern | Owns | Approx LoC |
|---------|------|----|
| Tab state | `selectedTabIndex`, `onTabChange`, "discard unapplied edits" rule | ~10 |
| Form state — Primary | `primaryFormGroup`, `primarySnapshot`, defaults/cancel/apply, enable/disable | ~25 |
| Form state — Secondary | mirror of Primary for `secondary*` | ~25 |
| CMD state | `cmdDraft`, `cmdSaved`, `onCmdSelectionChange`, "Apply also commits CMD" coupling | ~10 |
| Test mode | `testMode`, `cmdDisabled`, `onTestModeChange` (drives form `disable()` + CMD disable) | ~10 |
| Grid streams | `primaryRows$` / `secondaryRows$` (post-Phase-7 async-pipe refactor) | ~12 |
| API orchestration | `buildPayload`, `postPrimary` / `postSecondary`, commit handlers | ~25 |

The smell isn't any single concern — each is small. It's that they share instance fields: `cmdSaved` is touched by both commit handlers, `testMode` triggers form + CMD disable, `selectedTabIndex` decides which form gets reset on tab switch. This makes per-concern testing harder than it should be and grows with every new behavior.

**Proposed decomposition:**

1. Introduce a `BoardController` (one per board) holding `formGroup`, `snapshot`, the apply/cancel/defaults handlers, and the POST call. Two instances — `PrimaryBoardController`, `SecondaryBoardController` — instantiated by the shell, passed down to the board template.
2. Shell shrinks to: tabs + CMD + test-mode + two controller refs. The shared concerns (`cmdDraft` / `cmdSaved`, `testMode`) stay on the shell because they actually are shared across both boards.
3. Optional follow-up: extract a `GridRowsService` so `data.connect()` doesn't live in the shell at all. Modest win — defer until the third consumer of grid rows exists.

**Out of scope for Phase 8** (revisit later, in priority order):
- A formal state machine for the per-board lifecycle (`pristine → editing → posting → applied`). Premature until "show spinner during POST" or "block tab switch while POSTing" is asked for.
- Migration to typed reactive forms. Lands when the host project upgrades past Angular 14.

**Acceptance criteria:**
- Shell file drops under ~120 LoC; each `BoardController` is independently unit-testable without spinning up the full shell module.
- Existing shell spec re-targets the controllers where appropriate; the shell itself only keeps tests for the cross-board behaviors (CMD sharing, tab-switch reset, test mode).
- `ng test` + `ng build` clean. No behavior change visible at the UI layer.

**Why deferred (not blocking Phase 7):**
- The shell is correct today and well-tested (12 specs covering every observable behavior). The complexity is annoying to read but not actively biting us.
- Splitting now risks the wrong abstraction — we'd be designing `BoardController` from a sample size of two boards that look almost identical. The migration target may add a third board with different semantics; that third use case will tell us what genuinely belongs on the controller and what stays on the shell.
- "Don't generalize until the third use case" applies — same rule we cited when we kept `PrimaryCommandsFormComponent` and `SecondaryCommandsFormComponent` as deliberate duplicates instead of one parameterized form.

---

## 11. Parallelism Map

```mermaid
graph LR
    P1["Phase 1: Models/Enums/Labels"]
    P2["Phase 2: Services"]
    P3["Phase 3: Grid/Footer/CMD"]
    P4["Phase 4: Board Layout"]
    P5["Phase 5: Form Components"]
    P6["Phase 6: Shell Integration"]
    P7["Phase 7: Polish"]
    
    P1 --> P2
    P1 --> P3
    P1 --> P4
    P1 --> P5
    P2 --> P6
    P3 --> P6
    P4 --> P6
    P5 --> P6
    P6 --> P7
```

After Phase 1, Phases 2-5 are independent and can run in parallel. Phase 6 depends on all of them. Phase 7 depends on Phase 6.

---

## 12. Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| WebSocket reconnect causes stale data | Medium | Medium | On reconnect, re-fetch via GET to seed fresh data before resuming the WS stream |
| Angular Material tabs destroy content on switch | Medium | Low | Keep `FormGroup` instances at shell level so they survive tab switches regardless |
| Grid row alignment with form rows | Medium | Medium | Use same `FieldConfig[]` array for both form and grid ordering; matching fixed row heights |
| 11-column grid overflow on small containers | Low | Medium | `minmax(0, 1fr)` columns + `text-overflow: ellipsis` + small font on grid cells |
| Secondary dual grid mappings (L1-R4 vs TLL/TLR/GDL) | Medium | Low | `buildSecondaryRows` util explicitly sets only mapped columns; grid renders empty string for missing keys |

---

## 13. Open Questions (from Spec)

- **Any fields scrolled out of view?** — The screenshots may not show all fields. Confirm the field lists in `field-definitions.md` are complete before Phase 5.
- **WebSocket URL / GET endpoints** — Not specified. Will use injection token with placeholder URLs.
- **Primary `videoRecType` (multi-select) wire shape** — Form value is `string[]`, but each grid cell shows a single abbreviation. Wire is currently typed as `string` (one display value per cell). Confirm whether the backend sends the full multi-select array or a single representative value before Phase 2's `grid-data.utils.ts` lands.
- **Primary `videoRecType` default `['no']`** — Currently pre-selects "No". Confirm whether this should be `[]` (no pre-selection) for a multi-select.
- ~~**Secondary `aCommands` / GDL shape**~~ — Resolved. `aCommands` carries 5 named props per side (TLL on left, TLR on right). The 6 GDL fields are flat on `EntityData` (no wrapper), duplicated across both entities — read from `entities[0]`.

---

## Next Steps

1. Review this plan
2. Start implementation with Phase 1 (Models, Enums, Labels)
3. After Phase 1, Phases 2-5 can run in parallel

---

## 14. Phase 5 Polish — Follow-up Notes (post-build)

These adjustments landed after the initial Phase 5 build, in response to demo-page visual review and a design discussion about `[disabled]` ergonomics. Captured here so Phase 6 starts from the corrected baseline.

### 14.1 Dropdown width — `.dropdown-stretch` opt-in utility

**Where**: `src/styles/_dropdowns.scss` — appended a single utility class:

```scss
.dropdown-stretch {
  .app-dropdown-wrapper { justify-content: stretch; }
  .app-dropdown-field.mat-form-field-appearance-fill { width: 100%; }
}
```

**Opt-in**: Both form root elements got `class="… dropdown-stretch"`. The class is generic — any future container that needs the same behavior just adds it; no domain-specific selectors hardcoded into the global stylesheet.

**Why global, not in each form's SCSS**: Material's `mat-form-field` internals sit behind the dropdown component's encapsulation. Reaching them from a component would need `::ng-deep` (project policy: avoid). The global file already owns every other `mat-form-field` override, so the new rule sits next to its peers and migrates with them.

**Effect**: Inside any `.dropdown-stretch` container, every dropdown fills its column → all dropdowns read the same width regardless of selected text length. Outside (CMD section, demo standalone previews, future consumers without the class), the dropdown keeps its default shrink-to-content behavior.

### 14.2 Board layout — CMD inside the left pane

**Where**: `src/app/features/system-experiments/components/system-experiments-board/system-experiments-board.component.{html,scss,spec.ts}`.

**Before**: CMD was a top row spanning the full board width (CMD → body → footer, vertical stack).

**After**: CMD sits inside a new `__left` pane stacked above the form. The `__body` is now `[__left | __grid]` side-by-side; the grid takes the full body height with no empty space above it.

**Why**: The user's visual feedback on the demo was that CMD, form, and footer should visually share a width. Putting CMD inside the left pane makes that "share a width" a structural property of the layout rather than a tuning game with margins.

```text
+------------------+----------------+
| CMD              |                |
| ---------------- |                |
| form (scrolls)   |   grid (4:6)   |
+------------------+----------------+
| footer (full width)               |
+-----------------------------------+
```

The footer stays a sibling of `__body` (full-width action bar); CMD sits alongside the form so they line up edge-to-edge. Spec assertions updated to lock both invariants: cmd+form+grid all live inside `__body`, footer does not; cmd+form share the `__left` container, grid does not.

### 14.3 Demo board preview — real envelope (1150 × 550)

**Where**: `src/app/demo/demo-page.component.scss`.

**Change**: The full-board demo now renders at the production envelope (`width: 1150px; height: 550px`). The narrow demo viewport (`max-width: 880px`) used to crush the layout, hiding bugs and making the form/grid pane look wrong. The parent `.demo-section` now allows `overflow-x: auto` so the section card scrolls horizontally on narrow demo viewports instead of clipping.

**Why this matters past the demo**: The grid is sized for ~640px (11 cols × 44 + 90 label = 574 minimum). At ~440px (the squashed demo), the grid was the dominant pressure on layout decisions. Sizing the demo to the real shell envelope means review feedback now applies to the actual production geometry.

### 14.4 Dropping the form components' `[disabled]` input

**Where**: `boards/primary-commands/primary-commands-form/primary-commands-form.component.ts`, `boards/secondary-commands/secondary-commands-form/secondary-commands-form.component.ts`, both `.spec.ts` files, plus the demo page.

**Before**:
```typescript
@Input() formGroup!: FormGroup;
@Input() disabled = false;

ngOnChanges(changes: SimpleChanges): void {
  if (changes['disabled'] || changes['formGroup']) {
    this.disabled
      ? this.formGroup.disable({ emitEvent: false })
      : this.formGroup.enable({ emitEvent: false });
  }
}
```

**After**:
```typescript
@Input() formGroup!: FormGroup;
```

**Why**: Two sources of truth for "is this form disabled?" (the boolean input and the `FormGroup`'s own state) is one too many. The shell already owns the `FormGroup`; making it own the disabled bit too keeps a single source of truth and removes a whole `ngOnChanges` lifecycle hook from each form component.

**Phase 6 contract**: The shell holds the test-mode toggle. When test mode flips, the shell calls `primaryFormGroup.disable()` / `.enable()` (and similarly for secondary). The form components are pure renderers — they read the FormGroup, project it through `formControlName`, and Angular's `FormGroup.statusChanges` propagates the disabled state down to every control automatically.

**Spec rewrites**: Both `*-form.component.spec.ts` files dropped the host wrapper's `disabled` field and replaced the two `[disabled]` input tests with two `formGroup.disable() / .enable()` tests that exercise the actual production contract. Net change: same coverage, fewer lines, no test for a layer that no longer exists.

**Demo update**: The demo's "Toggle disabled" buttons now call `togglePrimaryFormDisabled()` / `toggleSecondaryFormDisabled()` which hit `formGroup.disable()` / `.enable()` directly. The labels read `formGroup.disabled` instead of a local boolean. The full-board demo's projected primary form likewise drops the `[disabled]` attribute binding.
