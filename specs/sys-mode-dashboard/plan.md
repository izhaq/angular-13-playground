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
    Footer["BoardFooterComponent (singleton, shell-level)"]

    Shell -->|"subscribe"| DataSvc
    Shell -->|"POST on Apply"| ApiSvc
    Shell --- Footer

    subgraph tab1 [Tab 1 — Primary: System Commands]
        Primary["SystemExperimentsBoardComponent"]
        Cmd1["CmdSectionComponent"]
        Form1["PrimaryCommandsFormComponent"]
        Grid1["StatusGridComponent (8 cols)"]
        Primary --- Cmd1
        Primary --- Form1
        Primary --- Grid1
    end

    subgraph tab2 [Tab 2 — Secondary: Failure and Antenna]
        Secondary["SystemExperimentsBoardComponent"]
        Cmd2["CmdSectionComponent"]
        Form2["SecondaryCommandsFormComponent"]
        Grid2["StatusGridComponent (11 cols)"]
        Secondary --- Cmd2
        Secondary --- Form2
        Secondary --- Grid2
    end

    Shell --- Primary
    Shell --- Secondary

    DataSvc -->|"GET + WebSocket"| WS["Backend"]
    ApiSvc -->|"POST primary / POST secondary"| WS
```

> **Footer is shell-level, not board-level.** A single `BoardFooterComponent`
> is mounted by the shell outside the `mat-tab-group`. Its disabled state
> and labels are identical for both boards; the only per-board variance is
> which form's handler runs, and that's solved by `selectedTabIndex`-based
> dispatch. Putting the footer per-board would have meant two identical
> instances — see §5 (`SystemExperimentsShellComponent` and
> `BoardFooterComponent`) and the post-build follow-up note in §14.5.

### Architecture Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Form strategy | Reactive Forms | Spec requires programmatic disable, reset, defaults, and snapshot/restore on cancel |
| CMD state | Component properties on shell | Simple draft + saved values — no need for a dedicated service (code-simplification) |
| Grid component | Single reusable `StatusGridComponent` | Receives dynamic column config and row data — no board-specific knowledge |
| Board layout | Content projection via `ng-content` | Board provides a 3-slot surface (cmd / form / grid); each tab projects its specific form. The action-bar footer is shell-level, not part of the board. |
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
│   ├── build-defaults.ts                  # buildDefaultValues() — primitive consumed by each board's buildXxxCommandsDefaults()
│   ├── build-form-group.ts                # buildFormGroup() — primitive consumed by each form component's static createFormGroup()
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
    ├── system-experiments-shell/                  # Smart: tabs, Test Mode toggle, CMD state, snapshots, grid subscription, Apply/Cancel/Defaults wiring; mounts the singleton footer
    ├── system-experiments-board/                  # Dumb layout: sticky CMD + scrollable form + grid (3 ng-content slots — footer is shell-level)
    ├── cmd-section/                       # Dumb: 2 multi-dropdowns (side, wheel) — also owns CMD_SIDE_OPTIONS / CMD_WHEEL_OPTIONS
    ├── board-footer/                      # Dumb: Defaults, Cancel, Apply buttons (singleton, mounted by the shell — NOT projected into the board)
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

### `SystemExperimentsShellComponent` (Smart) — post-Phase-8 shape

**Owns (chrome + cross-board state only):**
- `testMode: boolean` + `cmdDisabled: boolean` (toggle + derived flag)
- `cmdDraft: CmdSelection` (live edits to CMD dropdowns)
- `cmdSaved: CmdSelection` (persisted on Apply success)
- `selectedTabIndex: number` + the tab-switch reset rule
- `primaryRows$` / `secondaryRows$` — derived from ONE shared upstream WebSocket via `shareReplay({ bufferSize: 1, refCount: true })` and consumed via `| async` (no manual subscribe)
- The singleton `BoardFooterComponent` + `onActive*` dispatch routing footer events to the active controller

**Composes (per-board state lives in services):**
- `PrimaryCommandsBoardService` (component-scoped, exposed as `readonly primary`)
- `SecondaryCommandsBoardService` (component-scoped, exposed as `readonly secondary`)

Each service owns: its `formGroup` (eagerly built from the sibling fields module via `buildFormGroup(_ALL_FIELDS)`), its last-applied `snapshot`, and its `defaults / cancel / apply / setEnabled` handlers. POST orchestration and snapshot commit on success live inside `apply()`. See §15 for the full rationale.

**Key logic on the shell:**
- On Apply (active tab): `activeBoard.apply(cmdDraft).subscribe({ next: () => cmdSaved = cmdDraft, error: noop })`. The service commits its own snapshot inside `apply()`'s `tap` before the shell's `next` fires.
- On Cancel / Defaults: one-line delegate to `activeBoard.cancel()` / `activeBoard.defaults()`.
- On tab change: `activeBoard.cancel()` (discards the leaving tab's unapplied edits per spec) before `selectedTabIndex` updates. CMD is shared and intentionally untouched.
- On Test Mode toggle: fans out `setEnabled(testMode)` to both services + flips `cmdDisabled`.

**Template:** `mat-tab-group` with two `mat-tab`, each containing `<system-experiments-board>` with the form bound via `[formGroup]="primary.formGroup"` / `[formGroup]="secondary.formGroup"`. Test/live toggle is `mat-slide-toggle` above tabs. The shared `<system-experiments-board-footer>` is mounted once outside the `mat-tab-group`.

### `SystemExperimentsBoardComponent` (Dumb Layout)

**Purpose:** Provides the per-tab content surface — a left pane (CMD stacked above the scrollable form) plus a grid pane on the right. The action-bar footer is **not** part of the board; the shell mounts a single shared `BoardFooterComponent` outside the `mat-tab-group` (same disabled state and labels for both boards, so per-tab footers would be redundant — see `BoardFooterComponent` below).

**Inputs / Outputs:** none.

**Template uses `ng-content` with three named slots:**
```html
<div class="board">
  <div class="board__body">
    <div class="board__left">
      <div class="board__cmd"><ng-content select="[boardCmd]"></ng-content></div>
      <div class="board__form"><ng-content select="[boardForm]"></ng-content></div>
    </div>
    <div class="board__grid"><ng-content select="[boardGrid]"></ng-content></div>
  </div>
</div>
```

**SCSS:** `height: 100%`. Body is a 2-column grid (`__left | __grid`). Left pane is a flex column with CMD pinned above the scrollable form; grid scrolls independently. Uses `%` / `fr` widths for resize support. The horizontal divider above the footer lives on the SHELL (`.system-experiments-shell__footer::before`), not here, so it can run edge-to-edge across the whole shell envelope.

### `CmdSectionComponent` (Dumb)

**Inputs:** `selection: CmdSelection`, `disabled: boolean`
**Outputs:** `selectionChange: EventEmitter<CmdSelection>`

Two `app-multi-dropdown` instances (Side and Wheel) bound via CVA `formControlName` to an internal `FormGroup` that emits on `valueChanges`. Labels from `LABELS.cmdSide` / `LABELS.cmdWheel`.

### `BoardFooterComponent` (Dumb — singleton)

**Inputs:** `disabled: boolean` (kills all three buttons — used for live mode); `applyDisabled: boolean` (additive — kills only Apply when CMD scope is incomplete).
**Outputs:** `defaults`, `cancel`, `apply` (all `EventEmitter<void>`).

Three `mat-button` elements. Stamps stable `data-test-id="footer-{action}"` (no board namespace — the footer is a singleton mounted by the shell outside the `mat-tab-group`, so the ids are unambiguous by construction). Labels from `LABELS`.

The shell holds a single instance and routes its three events to the active board via `selectedTabIndex`-based `onActiveDefaults()` / `onActiveCancel()` / `onActiveApply()` dispatchers. Both boards share identical disabled rules and identical labels, so per-tab footers would be pure duplication; pulling it up also keeps `SystemExperimentsBoardComponent` a pure 3-slot layout instead of leaking action-bar concerns into the layout primitive.

### `PrimaryCommandsFormComponent` (Dumb — Primary)

**Inputs:** `formGroup: FormGroup`
**Statics:** `createFormGroup(): FormGroup`, `defaultValues(): Record<string, string | string[]>`
**No outputs** — parent reads `formGroup.getRawValue()` directly.

Iterates `PRIMARY_COMMANDS_MAIN_FIELDS` config to render 11 dropdowns using `app-dropdown` / `app-multi-dropdown` with `formControlName`. Below the main fields, a bordered "Cmd to GS" section with 3 more dropdowns (`PRIMARY_COMMANDS_CMD_TO_GS_FIELDS`). Each dropdown gets `[attr.data-test-id]="'form-' + BOARD_IDS.primary + '-' + field.key"` (Secondary form uses `BOARD_IDS.secondary` — the board id is hard-coded per form, not threaded through as an input, since each form component owns exactly one board).

**Form-shape ownership** (post-§14.6): the component owns the *factory* via static `createFormGroup()` + canonical `defaultValues()`; the shell owns the *lifetime* (it holds the FormGroup instance across tab unmount/remount cycles, since Material lazy-renders mat-tab content). Disable/enable is driven on the FormGroup itself by the shell — no `[disabled]` input or `ngOnChanges` hook lives on this component.

### `SecondaryCommandsFormComponent` (Dumb — Secondary)

Same pattern, 14 fields from `SECONDARY_COMMANDS_ALL_FIELDS` (composed of `SECONDARY_COMMANDS_8COL_FIELDS` + `SECONDARY_COMMANDS_TLL_TLR_FIELDS` + `SECONDARY_COMMANDS_GDL_FIELDS` + `SECONDARY_COMMANDS_MULTI_LOCATION_FIELDS`). Same static `createFormGroup()` / `defaultValues()` API as Primary. No sub-sections. All fields render as grid rows.

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
| Form state (Primary) | `FormGroup` instance owned by shell, shape factory owned by `PrimaryCommandsFormComponent.createFormGroup()` | Passed back to `PrimaryCommandsFormComponent` via `[formGroup]` |
| Form state (Secondary) | `FormGroup` instance owned by shell, shape factory owned by `SecondaryCommandsFormComponent.createFormGroup()` | Passed back to `SecondaryCommandsFormComponent` via `[formGroup]` |
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

**Tests delivered (originally 6 specs; reshaped to 7 specs after the §14.5 footer-unify follow-up — board is now a 3-slot surface):**
- `system-experiments-board.component.spec.ts` — three structural slot containers render (`__cmd`, `__form`, `__grid`); each marker (`[boardCmd]`, `[boardForm]`, `[boardGrid]`) projects into the matching container; explicit "no footer slot" assertion locks the contract that the footer is shell-level; cmd + form live inside the left pane while grid does not; the body container holds all three.

**Notes from Phase 4 implementation:**
- Zero inputs, zero outputs, zero logic. The board is pure layout — 3 `ng-content` slots wrapped in flex/grid containers (originally 4 with a footer slot; the §14.5 follow-up removed the footer slot when the action bar was promoted to a shell-level singleton). The shell wires data and events directly to the projected children — `[disabled]` flows from shell to `<primary-commands-form [disabled]="…" boardForm>`, not through the board. Spec table mention of "Receives `disabled` from test/live mode" describes data flow, not a literal `@Input` on the board.
- "Sticky" behavior comes from flex/grid layout (`__cmd` is `flex: 0 0 auto` inside the left pane; `__form` and `__grid` `overflow: auto` independently) rather than `position: sticky`. Cleaner: no stacking-context games, no scroll-container assumptions, no need for the parent to be the scroll root.
- Form / grid horizontal split is **fixed-width left pane (280px) + grid `1fr`** — gives the 11-column secondary grid the ~640–800px pane it needs (90 + 11 × 44 = 574px minimum). Documented at the top of the SCSS so it's tunable in one place.
- `min-height: 0` on the body and `min-width: 0` / `min-height: 0` on form/grid columns are critical — without them, flex/grid children refuse to shrink below their intrinsic content size and the layout overflows on narrow shells. Comments in the SCSS explain why each one is needed.
- Slot markers use plain attribute selectors (`[boardCmd]`, `[boardForm]`, `[boardGrid]`) so consumers can attach them to any element or component without coupling the layout to a specific child class. CamelCase chosen to match the rest of Angular's directive / projection conventions.

### Phase 5: Form Components (M) — ✅ Complete

- `PrimaryCommandsFormComponent` (under `boards/primary-commands/primary-commands-form/`) — 11 main fields + 3 "Cmd to GS" fields, all from config arrays
- `SecondaryCommandsFormComponent` (under `boards/secondary-commands/secondary-commands-form/`) — 14 fields

Both consume `FormGroup` + `disabled` as inputs. All dropdowns use `formControlName` (CVA via `AppDropdownCvaDirective`).

**Acceptance criteria:** Forms render all fields with correct options and defaults. Disable/enable toggles all controls. Test IDs on every dropdown. `ng test` passes.

**Tests delivered (12 specs total, all green):**
- `primary-commands-form.component.spec.ts` (6 specs) — one dropdown per field in `PRIMARY_COMMANDS_ALL_FIELDS` (with total-count sanity); "Cmd to GS" sub-section header + its three fields render; multi vs single fields render via the right dropdown component (`app-multi-dropdown` vs `app-dropdown`); FormGroup seeded to per-field defaults; `[disabled]=true` disables the whole FormGroup and every control; flipping back re-enables it
- `secondary-commands-form.component.spec.ts` (6 specs) — same shape for `SECONDARY_COMMANDS_ALL_FIELDS`, plus an explicit "no sub-section header" assertion since the secondary form is intentionally flat

**Notes from Phase 5 implementation:**
- **`buildFormGroup(fields)` util added in `boards/build-form-group.ts`** — takes a `FieldConfig[]` and returns a `FormGroup` with one `FormControl` per field, seeded to the field's `defaultValue`. **Post-§14.6**, its only consumers are each form component's static `createFormGroup()` factory; the shell calls those factories rather than `buildFormGroup` directly. Keeping the primitive centralised means every board materialises its FormGroup the same way (single `new FormControl` policy, single `defaultValue` mapping) even though each board's field list lives in its own module.
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
- **Test Mode disables CMD + both forms; the grid stays alive.** The single shared footer's three buttons are bound to `[disabled]="!testMode"` (so Apply/Cancel/Defaults can't fire while controls are read-only). The Test Mode toggle itself stays interactive. Apply additionally honors `[applyDisabled]="applyDisabled"` (true while CMD scope is incomplete — see `applyDisabled` getter docs).
- **Footer is one shared instance, mounted by the shell outside the `mat-tab-group`** (see §14.5 follow-up). Its three events fan out to the active board through `onActive*` dispatchers, which are trivial ternaries on `selectedTabIndex`. Rationale: both boards share identical disabled / labels — per-tab footers were pure duplication.
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

### Phase 8: Shell Decomposition — Per-Board Controllers (M) — **done** (see §15)

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
| Footer dispatch | `onActiveDefaults / onActiveCancel / onActiveApply` (route the singleton footer's events to the active board's per-board handler) | ~6 |

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

### 14.5 Single shared `BoardFooterComponent` — promoted to shell-level

**Where**: `system-experiments-shell/system-experiments-shell.component.{html,scss,ts,spec.ts}`, `components/board/board.component.{html,scss,ts,spec.ts}`, `components/board-footer/board-footer.component.{html,ts,spec.ts}`, `shared/ids.ts`, `src/app/demo/demo-page.component.html`.

**Before**: Each tab projected its own `<system-experiments-board-footer boardFooter [boardId]="…" …>` into the board's `[boardFooter]` slot — two instances, identical disabled state and labels, only differing in `boardId` (for `data-test-id` namespacing) and which `onPrimary*` / `onSecondary*` handlers their events were wired to.

**After**: The shell mounts ONE `<system-experiments-board-footer>` outside the `mat-tab-group` and dispatches its three events to the active board via `onActiveDefaults() / onActiveCancel() / onActiveApply()` (a one-line ternary on `selectedTabIndex`). The board's `[boardFooter]` slot is removed; `BoardComponent` becomes a pure 3-slot surface. `BoardFooterComponent` drops its `boardId` input and stamps stable `data-test-id="footer-{action}"` (no namespace).

**Why**: The two instances were always rendering identically — same `[disabled]="!testMode"`, same `[applyDisabled]="applyDisabled"`, same labels. The only per-tab difference was the handler routing, which the shell already knows how to do via `selectedTabIndex`. The historical justification ("Material's mat-tabs might mount both at once if `preserveContent` were ever flipped on") was speculative; today's lazy-render strategy means there's no scenario where two footers can coexist anyway.

**Wins**:
- One less component instance per render (and the `boardId` input + namespace concatenation are gone).
- `BoardFooterComponent`'s API shrinks from 3 inputs to 2 — the `boardId` was only used for test-id stamping.
- `BoardComponent` becomes a 3-slot surface (cmd / form / grid). The "self-contained 4-region card" mental model softens, but it was already partially broken — the user-visible footer divider was specced to run edge-to-edge across the shell anyway (see §14.2 discussion / shell SCSS), so a chrome-level footer matches the visual intent better than a board-level one did.
- Footer divider moves from `board.component.scss` to `system-experiments-shell.component.scss` as a `::before` on `.system-experiments-shell__footer` — same divider color (`#4a4a4a`), now structurally correct (it separates the action bar from the tab content area, not from the board's content area).

**Spec rewrites**:
- `board-footer.component.spec.ts`: dropped the `boardId` field from the host wrapper; `btn(action)` looks up `[data-test-id="footer-${action}"]` directly. The "namespaces test ids by boardId" test was deleted (the contract no longer exists).
- `board.component.spec.ts`: dropped the `boardFooter` projection from the host template and the corresponding "projects footer slot" test; added an explicit "no `.board__footer` rendered" assertion to lock the new contract.
- `system-experiments-shell.component.spec.ts`: added four tests covering `onActiveDefaults / onActiveCancel / onActiveApply` — they route to the active tab's `onPrimary*` / `onSecondary*` handler and don't touch the inactive tab's form.

**Test-id convention update** (`shared/ids.ts` doc comment): `footer-{boardId}-{action}` → `footer-{action}`. The other namespaced patterns (`form-`, `grid-`, `grid-header-`, `grid-label-`) keep the `boardId` prefix because both forms / grids are structurally separate per-tab and would silently collide if Material ever flipped to `preserveContent`.

**Why this is independent of (and complementary to) Phase 8 / shell decomposition**: Whichever path Phase 8 takes (`BoardController` per board, or smart `BoardTabComponent` per board), the unified footer simplifies the controller's API. Each per-board concern now exposes only `defaults / cancel / apply` *methods*; it no longer needs to project a footer or expose three `(footerEvent)` outputs. Doing the unify first keeps each Phase 8 change surgical.

### 14.6 Form components own their FormGroup *shape* (static factory) — **superseded by §15**

> **Superseded by Phase 8 / §15.** This section described an intermediate state where each form component exposed `static createFormGroup()` / `static defaultValues()` and the shell called those statics instead of importing the field constants directly. When Phase 8 introduced per-board services as the new home for FormGroup ownership, the statics' only meaningful caller (the shell) went away — the new services are sibling files to the fields modules and call `buildFormGroup` directly. The statics were rolled back; form components are now pure renderers again. The original rationale below is preserved as historical context for why the intermediate step looked attractive at the time.

**Where**: `boards/primary-commands/primary-commands-form/primary-commands-form.component.ts`, `boards/secondary-commands/secondary-commands-form/secondary-commands-form.component.ts`, `system-experiments-shell/system-experiments-shell.component.{ts,spec.ts}`, `boards/build-form-group.ts`, `src/app/demo/demo-page.component.ts`, plus both form `*.component.spec.ts`.

**Before**: The shell imported `PRIMARY_COMMANDS_ALL_FIELDS`, `SECONDARY_COMMANDS_ALL_FIELDS`, `buildPrimaryCommandsDefaults`, `buildSecondaryCommandsDefaults` and `buildFormGroup`, then assembled the FormGroup itself:

```ts
readonly primaryFormGroup: FormGroup = buildFormGroup(PRIMARY_COMMANDS_ALL_FIELDS);
readonly secondaryFormGroup: FormGroup = buildFormGroup(SECONDARY_COMMANDS_ALL_FIELDS);
// ...
this.primaryFormGroup.reset(buildPrimaryCommandsDefaults(), { emitEvent: false });
```

The shell knew the field-list constant name, the defaults-builder name, and the construction primitive. Three separate identifiers across two modules per board, all just to materialise one FormGroup.

**After**: Each form component exposes two static methods that encapsulate "what shape is my form":

```ts
export class PrimaryCommandsFormComponent {
  static createFormGroup(): FormGroup { return buildFormGroup(PRIMARY_COMMANDS_ALL_FIELDS); }
  static defaultValues(): Record<string, string | string[]> { return buildPrimaryCommandsDefaults(); }
  @Input() formGroup!: FormGroup;
}
```

The shell drops three imports per board and reads as:

```ts
readonly primaryFormGroup: FormGroup = PrimaryCommandsFormComponent.createFormGroup();
// ...
this.primaryFormGroup.reset(PrimaryCommandsFormComponent.defaultValues(), { emitEvent: false });
```

**Why static and not instance**: Material lazy-renders mat-tab content — the inactive tab's form component does not exist yet, but the shell needs BOTH FormGroups available upfront so they survive tab unmount/remount cycles and stay reachable from Apply/Cancel/snapshot handlers regardless of which tab is currently visible. A `@ViewChild`/`@Output ready` "form owns the FormGroup" pattern would tie FG lifetime to component lifetime and break this. Static factory keeps the right split: the form module owns the *shape*, the shell owns the *lifetime*.

**Why not Reactive Forms `ControlValueAccessor`**: CVA on the form components would hide the FormGroup behind `writeValue / registerOnChange`, force the shell to operate on opaque values instead of typed FormControls, double the wiring (`ngOnChanges` + change-emission plumbing inside each form), and gain nothing — the shell already needs the FormGroup itself for `disable() / enable()` and `reset(snapshot)`. Static factories give us the encapsulation win (shell stops importing field-config constants) without paying CVA's boilerplate or losing the typed FormGroup surface. See discussion in this thread for the full analysis.

**Wins**:
- Shell drops 3 imports per board (5 total): `PRIMARY_COMMANDS_ALL_FIELDS`, `SECONDARY_COMMANDS_ALL_FIELDS`, `buildPrimaryCommandsDefaults`, `buildSecondaryCommandsDefaults`, `buildFormGroup` — replaced by importing the form component classes that the shell was already (transitively) declaring via the module.
- New form-shape additions live in one place: add a field to `xxx-commands.fields.ts`, no shell change needed. (Before: shell didn't need a code change either, but it imported the field list, so the dependency was visible in the shell's import block — easy to trip over during a future split.)
- The form component class becomes the natural API surface for "everything about this form" — a clean target for Phase 8 to lift into a controller / smart `BoardTabComponent` later. Migration is mechanical: move the two statics + the `@Input formGroup` to the new owner, the shell calls a service method instead of `Foo.createFormGroup()`.

**`build-form-group.ts` doc updated**: now documents that its only consumers are the per-board form components' `createFormGroup()` factories. The util stays — it's the shared primitive enforcing "single `new FormControl` policy" across boards — but its audience is constrained.

**Spec rewrites**:
- Both form specs: host wrappers now seed the FormGroup via `XxxCommandsFormComponent.createFormGroup()` instead of `buildFormGroup(XXX_ALL_FIELDS)` — same factory the shell uses, so any drift surfaces here too. Added a new `describe('static form-shape API')` block per form covering: `createFormGroup` returns a FormGroup with one control per declared field, seeded to defaults, fresh on every call (no shared state); `defaultValues` matches the seed values and is also fresh per call.
- Shell spec: dropped `PRIMARY_COMMANDS_ALL_FIELDS`, `buildPrimaryCommandsDefaults`, `buildSecondaryCommandsDefaults` imports. Default-equivalence assertions now use `XxxCommandsFormComponent.defaultValues()`. The "Apply ships every field" assertion now uses `Object.keys(PrimaryCommandsFormComponent.defaultValues())` — testing that the shell's payload matches what the form declares is the right contract anyway.

**Why this is a *small* refactor (and the right next step before Phase 8)**: This is a 1-import-list change, not an architectural shift. It does not move state ownership, change lifecycles, or alter component contracts. It just relocates the "what fields does this board have" knowledge from the shell back to the form module where it conceptually belongs. The shell becomes slightly easier to read and Phase 8 becomes slightly easier to plan; if Phase 8 doesn't happen, this still stands on its own as a pure encapsulation win. No new tests fail; no behaviour changes.

---

## 15. Phase 8 implementation notes — Per-board services

> **Naming.** Originally drafted as `*BoardController` to match Phase 8's "controller" framing in §10. Renamed to `*BoardService` before merge to align with Angular's style guide (rule 02-04: `@Injectable()` classes use the `Service` suffix and `.service.ts` filename). The framing didn't change — these still play the per-board "controller" role conceptually — only the identifier and filename. Wherever this section refers to a "service", read it as "the per-board controller for this tab".

**Where**: `boards/primary-commands/primary-commands-board.service.{ts,spec.ts}`, `boards/secondary-commands/secondary-commands-board.service.{ts,spec.ts}`, `system-experiments-shell/system-experiments-shell.component.{ts,html,spec.ts}`. Plus the §14.6 rollback: both form components stripped of their static factories, both form specs lose their static-API `describe` blocks, the demo and shell spec switch to `buildFormGroup` / `build*Defaults` directly.

**Before** (post-§14.6 shape): The shell still owned every per-board concern as fields and methods on a single class — two FormGroups, two snapshots, six `onPrimary…` / `onSecondary…` handlers, two payload builds, and the test-mode `disable()` / `enable()` fan-out. About half the file existed twice (once per board) with `primary…` / `secondary…` prefixes — symmetric duplication that read fine line-by-line but obscured "what does the shell actually do" because the shape repeated. The full enumeration is the table at the top of §10's "Phase 8" section.

**After**: Two component-scoped services — `PrimaryCommandsBoardService` and `SecondaryCommandsBoardService` — own everything per-board. Each has the same surface:

```ts
@Injectable()
export class XxxCommandsBoardService {
  readonly formGroup: FormGroup = buildFormGroup(XXX_COMMANDS_ALL_FIELDS);
  private snapshot = this.formGroup.getRawValue();
  constructor(private api: SystemExperimentsApiService) {}
  defaults(): void;          // form.reset(buildXxxCommandsDefaults())
  cancel(): void;            // form.reset(snapshot)
  apply(cmd): Observable<void>;   // POST + tap(commit snapshot on success)
  setEnabled(enabled): void; // form.enable/disable({ emitEvent: false })
}
```

The shell composes them via component-scoped `providers` and exposes them as `readonly primary` / `readonly secondary` (constructor injection). Template bindings change one token: `[formGroup]="primary.formGroup"` instead of `[formGroup]="primaryFormGroup"`. Footer dispatch handlers collapse to one-liners that delegate to `activeBoard.{defaults,cancel,apply}()`.

**Why services rather than fields-on-shell**: Two reasons that compose:

1. *Independent unit testability.* The service is plain DI — `new XxxBoardService(apiSpy)` in a `beforeEach`, no TestBed, no fixture, no module wiring. Every per-board behaviour (snapshot commit on success, snapshot **non**-commit on error, `setEnabled` swallowing `valueChanges`, payload field set) gets pinned in milliseconds in a tight scope. The shell's spec stops carrying that weight and shrinks to dispatch + cross-board behaviour.
2. *The shell's job becomes describable in one sentence.* "Owns chrome (tabs, test mode, CMD), the cross-board `cmdSaved` commit on Apply success, the shared grid stream, and the singleton footer's dispatch to the active service." Every word is observably true from reading the file. Pre-Phase-8 you couldn't say this without ignoring half the methods.

**Why two sibling services, not one base class**: The boards differ ONLY in which API endpoint Apply hits (`postPrimary` / `postSecondary`) and which sibling fields module seeds the FormGroup. A base class would parameterise on a 1-line difference and add generics + an abstract method to do it. Two ~30-line files are easier to read and easier to evolve when one board eventually grows a behaviour the other doesn't. Same call we made for the form components themselves (§13: "don't generalize until the third use case"). When a third board lands and the surface is genuinely identical, that's the moment to reach for a base.

**Why `apply()` returns `Observable<void>` rather than committing everything internally**: On Apply success the shell ALSO has to commit `cmdSaved` (the shared CMD scope across both tabs). That's cross-board state and must stay at shell scope — services don't know about CMD. If `apply()` swallowed the observable, the shell would lose the success hook and need a separate `(applied)` event/output to carry "applied" back up. Strictly worse. Keeping the observable hot lets the shell chain `.subscribe(() => this.cmdSaved = this.cmdDraft)` and gives the caller full control over teardown (`takeUntil(destroy$)`). The snapshot commit (per-board side effect) lives INSIDE `apply()`'s pipe via `tap`; the cross-board side effect (`cmdSaved`) lives at the shell's `.subscribe`. Each side effect is owned by the layer that owns the state it touches.

**Lifetime parity with Phase 6**: Services are component-scoped via `providers: []` on the shell, so a new service is created each time the shell mounts and disposed with it. Same lifetime as the per-board fields had before — no change in observable semantics, no change in initial-frame timing or destroy ordering.

**Why the eager FormGroup seeding stays**: Material lazy-renders mat-tab content — the inactive tab's form component does not exist yet. Both services materialise their FormGroups in field initialisers (`= buildFormGroup(XXX_COMMANDS_ALL_FIELDS)`), so both forms are reachable from Apply / snapshot logic regardless of which tab is currently visible. Same constraint that drove §14.6, just relocated from the shell to the services. Same constraint that keeps two snapshots (one per service) rather than a shared one — see §14.6 thread for why a single shared snapshot would either lose state on tab switch or require gnarly conditional logic.

**Stays on the shell** (ownership matches scope):
- `cmdDraft` / `cmdSaved` — shared across both tabs.
- `testMode` / `cmdDisabled` — global UI state.
- `selectedTabIndex` — chrome.
- `primaryRows$` / `secondaryRows$` — derived from ONE shared upstream WebSocket via `shareReplay({ bufferSize: 1, refCount: true })`. Moving the read-side into services would either duplicate the subscription or force the service to depend on the shell's stream. Cleaner to keep the read-side at shell scope and let services stay focused on the write-side (Apply / state).
- The singleton `BoardFooterComponent` and its `onActive*` dispatchers (introduced in §14.5).

**Why §14.6's static factories were rolled back during this phase**: §14.6 introduced `static createFormGroup()` / `static defaultValues()` on each form component to remove the shell's coupling to the field constants. With Phase 8, the shell no longer constructs FormGroups — the per-board services do. The services live as siblings to the fields modules (`primary-commands/` contains both `primary-commands.fields.ts` AND `primary-commands-board.service.ts`), so the indirection that §14.6 was paying for had no recipient: the service IS in the same folder as the field constant, importing it directly is local coupling, not cross-folder coupling. The statics were left earning their keep only for the demo (one external consumer) and the form spec (drift-detection seam) — too thin to justify a contract that every board's form component had to maintain. Rolled back: form components revert to pure renderers, demo + form spec call `buildFormGroup` / `buildXxxCommandsDefaults` directly. The §14.6 spec block (5 specs per form, 10 total) is gone — the contract no longer exists. See discussion in this thread for the full trade-off analysis.

**Pre-existing latent bug surfaced and fixed during this phase**: `onActiveApply` (and pre-Phase-8, `onPrimaryApply` / `onSecondaryApply`) called `.subscribe(() => commit)` with no error handler. RxJS rethrows unhandled subscriber errors into the global scope — on a real backend hiccup this would crash the page. Fixed by adopting the explicit-callbacks subscribe shape (`{ next, error }`) with the error branch as a documented no-op (with a TODO pointing the host app to wire snackbar / toast feedback there). Strictly safer; no observable change in the happy path.

**File diff summary**:

| File | Δ |
|------|---|
| `boards/primary-commands/primary-commands-board.service.ts` | **new**, ~115 LoC |
| `boards/primary-commands/primary-commands-board.service.spec.ts` | **new**, 10 specs |
| `boards/secondary-commands/secondary-commands-board.service.ts` | **new**, ~65 LoC |
| `boards/secondary-commands/secondary-commands-board.service.spec.ts` | **new**, 9 specs |
| `boards/primary-commands/primary-commands-form/primary-commands-form.component.ts` | -30 LoC (statics + their docs gone) |
| `boards/secondary-commands/secondary-commands-form/secondary-commands-form.component.ts` | -25 LoC (mirror) |
| `boards/.../primary-commands-form.component.spec.ts` | -5 static-API specs; host wrapper switches to `buildFormGroup` |
| `boards/.../secondary-commands-form.component.spec.ts` | -5 mirror |
| `system-experiments-shell.component.ts` | -65 LoC; collapses to chrome + dispatch |
| `system-experiments-shell.component.html` | 2 token changes (`primaryFormGroup` → `primary.formGroup`) |
| `system-experiments-shell.component.spec.ts` | -11 per-board action specs (now in service specs); +6 dispatch / commit / fan-out specs |
| `boards/build-form-group.ts` | doc-only (audience: services + demo + form specs, no longer the form components' statics) |
| `src/app/demo/demo-page.component.ts` | switches to `buildFormGroup` directly |
| `plan.md` | this section + §6 update + §14.6 superseded note |

Total test count: 128 → **137** (+19 from the two service specs and the new shell specs; -10 from the §14.6 static-API rollback).

**Spec rewrite philosophy**: Per-board action mechanics (snapshot semantics, payload field set, defaults shape, `setEnabled` no-emit) all moved to the service specs. The shell spec keeps composition (both services wired), `applyDisabled` (CMD scope validation), `onActive*` dispatch (which service method got called), `cmdSaved` commit on success / non-commit on error (the only piece of cross-board Apply state owned by the shell), tab-switch reset (shell calls `activeBoard.cancel()`), and test-mode fan-out (`setEnabled(false)` called once on each service). Re-asserting service mechanics in the shell suite would make the suite re-fail on every service change for no diagnostic gain.

**Out of scope for Phase 8** (still deferred per §10):
- A formal state machine for the per-board lifecycle (`pristine → editing → posting → applied`). Premature until "show spinner during POST" or "block tab switch while POSTing" is asked for. Today the service's `apply()` is a one-shot observable; if those needs land, surface a `status$` BehaviorSubject on the service and let the footer subscribe.
- Migration to typed reactive forms. Lands when the host project upgrades past Angular 14.
- Extracting a `GridRowsService` so `data.connect()` doesn't live in the shell at all. Modest win — defer until the third consumer of grid rows exists.
