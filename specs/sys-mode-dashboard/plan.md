# Engine Simulator Dashboard — Implementation Plan

**Feature**: engine-sim-dashboard
**Spec**: [spec.md](./spec.md)
**Field Definitions**: [field-definitions.md](./field-definitions.md)
**Date**: 2026-04-21
**Status**: Ready for Implementation

---

## 1. Architecture Overview

A single self-contained feature module (`EngineSimModule`) with one smart component (shell) orchestrating six dumb components. Data flows down via `@Input`, events flow up via `@Output`. No NgRx, no third-party libs beyond Material.

```mermaid
graph TD
    Shell["EngineSimShellComponent (smart)"]
    DataSvc["EngineSimDataService"]
    ApiSvc["EngineSimApiService"]
    
    Shell -->|"subscribe"| DataSvc
    Shell -->|"POST on Apply"| ApiSvc
    
    subgraph tab1 [Tab 1 — Primary: System Commands]
        Primary["EngineSimBoardComponent"]
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
        Secondary["EngineSimBoardComponent"]
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

All files live under `src/app/features/engine-sim/`:

```
engine-sim/
├── engine-sim.module.ts
├── shared/                                # Cross-board primitives (no UI)
│   ├── engine-sim.api-contract.ts         # Wire format: EngineSimResponse, EntityData, MCommandItem, BoardPostPayload, EngineSimApiConfig
│   ├── engine-sim.models.ts               # Internal view models: CmdSelection, GridColumn, GridRow, FieldConfig
│   ├── engine-sim.labels.ts               # ENGINE_SIM_LABELS centralized translation map
│   ├── engine-sim.tokens.ts               # ENGINE_SIM_API_CONFIG injection token
│   ├── option-values.ts                   # Canonical value maps + derived types (YES_NO, ON_OFF, SIDE, WHEEL, …)
│   ├── cmd-options.ts                     # CMD_SIDE_OPTIONS, CMD_WHEEL_OPTIONS (reused by both boards)
│   └── build-defaults.util.ts             # buildDefaultValues() helper
├── boards/                                # One folder per dashboard tab — self-contained
│   ├── primary-commands/                  # Primary — "System Commands" tab (frequently used)
│   │   ├── primary-commands.options.ts    # DropdownOption arrays (with `abbr`)
│   │   ├── primary-commands.fields.ts     # PRIMARY_COMMANDS_*_FIELDS configs + buildPrimaryCommandsDefaults()
│   │   ├── primary-commands.columns.ts    # 8-column grid
│   │   └── primary-commands-form/         # Phase 5 form component (11 main + 3 "Cmd to GS" fields)
│   └── secondary-commands/                # Secondary — "Failure & Antenna" tab (less frequently used)
│       ├── secondary-commands.options.ts
│       ├── secondary-commands.fields.ts   # SECONDARY_COMMANDS_*_FIELDS configs + buildSecondaryCommandsDefaults()
│       ├── secondary-commands.columns.ts  # 11-column grid (reuses Primary's 8)
│       └── secondary-commands-form/       # Phase 5 form component (14 fields)
├── utils/
│   └── grid-data.utils.ts                 # Pure functions: response → grid rows (per board)
├── services/
│   ├── engine-sim-api.service.ts          # POST for each board
│   └── engine-sim-data.service.ts         # GET + WebSocket → Observable<EngineSimResponse>
└── components/                            # Cross-board / shell-level UI
    ├── engine-sim-shell/                  # Smart: tabs, toggle, CMD state, WS subscription
    ├── engine-sim-board/                  # Dumb layout: sticky CMD + scroll body + sticky footer
    ├── cmd-section/                       # Dumb: 2 multi-dropdowns (side, wheel)
    ├── board-footer/                      # Dumb: Defaults, Cancel, Apply buttons
    └── status-grid/                       # Dumb: dynamic grid with row labels, column hover, cell click
```

Each `boards/<board>/` folder is the **migration unit** — self-contained, depends only on `shared/`. Form components live inside their board folder so the whole dashboard moves as one piece.

---

## 4. Data Model

### Wire format (in `engine-sim.api-contract.ts`)

The types below cross the network boundary — they are dictated by the backend. Quarantined from the internal view models so a backend change is a one-file question.

```typescript
interface EngineSimResponse {
  entities: [EntityData, EntityData];
}

interface EntityData {
  entityId: 0 | 1;
  mCommands: MCommandItem[];
  aCommands: ACommandsData;
  aProp1: ColumnValue; aProp2: ColumnValue; aProp3: ColumnValue;
  aProp4: ColumnValue; aProp5: ColumnValue;
}

interface MCommandItem {
  standardFields: Record<string, ColumnValues>;
  additionalFields: Record<string, ColumnValues>;
}

type ColumnValues = [string, string, string, string];
```

### Grid view models (in `engine-sim.models.ts`)

```typescript
interface GridColumn {
  id: string;    // e.g. 'left1', 'right3', 'tll'
  label: string; // e.g. 'L1', 'R3', 'TLL'
}

interface GridRow {
  fieldKey: string;                    // matches form field key
  label: string;                      // from ENGINE_SIM_LABELS
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
export const TFF_OPTIONS: DropdownOption[] = [
  { value: TFF.NotActive,   label: L.tffNotActive,   abbr: 'NACV' },
  { value: TFF.LightActive, label: L.tffLightActive, abbr: 'LACV' },
  { value: TFF.Dominate,    label: L.tffDominate,    abbr: 'DMN' },
];

// boards/primary-commands/primary-commands.fields.ts
export const PRIMARY_COMMANDS_MAIN_FIELDS: FieldConfig[] = [
  { key: 'tff', label: L.tff, type: 'single', options: TFF_OPTIONS, defaultValue: TFF.NotActive, gridColGroup: 'all8' },
  // ...
];
```

All 25+ fields follow this structure. `PRIMARY_COMMANDS_ALL_FIELDS` (Primary) and `SECONDARY_COMMANDS_ALL_FIELDS` (Secondary) collect each board's field configs for iteration in forms and grid.

### Label map (in `engine-sim.labels.ts`)

Flat `const` object. Every user-visible string — field names, option labels, button text, section headers, grid headers — is keyed here. Templates reference `LABELS.fieldKey`, never a raw string.

---

## 5. Component Design

### `EngineSimShellComponent` (Smart)

**Owns:**
- `testMode: boolean` (toggle)
- `cmdDraft: CmdSelection` (live edits to CMD dropdowns)
- `cmdSaved: CmdSelection` (persisted on Apply)
- `primaryFormGroup` and `secondaryFormGroup` (created here, passed down)
- `primarySnapshot` / `secondarySnapshot` (for Cancel — last saved state)
- `gridData$: Observable<EngineSimResponse>` via `EngineSimDataService`
- `primaryRows` / `secondaryRows` — precomputed from `gridData$` using pure util functions

**Key logic:**
- On Apply (from either tab): merge CMD + form values into payload, call `EngineSimApiService`, snapshot form state on success
- On Cancel: `formGroup.reset(snapshot)`
- On Defaults: `formGroup.reset(DEFAULTS)`
- On tab change: no special action for CMD (it persists). Form state is lost if not applied (per spec — the `FormGroup` is per-tab but lives at shell level, so Angular handles this naturally via the tab component lifecycle)

**Template:** `mat-tab-group` with two `mat-tab`, each containing `<engine-sim-board>`. Test/live toggle is `mat-slide-toggle` above tabs.

### `EngineSimBoardComponent` (Dumb Layout)

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

Three `mat-button` elements with `data-test-id` attributes (`footer-defaults`, `footer-cancel`, `footer-apply`). Labels from `LABELS`.

### `PrimaryCommandsFormComponent` (Dumb — Primary)

**Inputs:** `formGroup: FormGroup`, `disabled: boolean`
**No outputs** — parent reads `formGroup.getRawValue()` directly.

Iterates `PRIMARY_COMMANDS_MAIN_FIELDS` config to render 11 dropdowns using `app-dropdown` / `app-multi-dropdown` with `formControlName`. Below the main fields, a bordered "Cmd to GS" section with 3 more dropdowns (`PRIMARY_COMMANDS_CMD_TO_GS_FIELDS`). Each dropdown gets `[attr.data-test-id]="'form-' + field.key"`.

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
- Test IDs: `[attr.data-test-id]="'grid-' + row.fieldKey + '-' + col.id"` on each cell

**SCSS:** White background, `1px solid` borders on cells, highlight class for hovered column, selected cell border. `text-overflow: ellipsis` on cells.

---

## 6. Services

### `EngineSimDataService`

```typescript
connect(): Observable<EngineSimResponse>
```

- Calls GET once on subscribe (seed data)
- Opens WebSocket and merges live updates via `merge(get$, ws$)`
- WebSocket wrapped in Observable with `share()` and `retry({ delay: 3000 })` for reconnect
- Single connection shared across both tabs (called once in shell `ngOnInit`)

### `EngineSimApiService`

```typescript
postPrimary(payload: BoardPostPayload): Observable<void>
postSecondary(payload: BoardPostPayload): Observable<void>
```

- Two POST endpoints (URLs from `ENGINE_SIM_API_CONFIG.primaryPostUrl` / `.secondaryPostUrl`), injected via `ENGINE_SIM_API_CONFIG` token for migration portability

---

## 7. Grid Data Transformation (`grid-data.utils.ts`)

Pure functions, no service needed:

```typescript
function buildPrimaryRows(response: EngineSimResponse, fields: FieldConfig[]): GridRow[]
function buildSecondaryRows(response: EngineSimResponse, fields: FieldConfig[]): GridRow[]
```

Maps `response.entities[0/1].mCommands[*].standardFields` (or `additionalFields` + `aCommands`) into `GridRow[]` with abbreviation lookups. Called in `EngineSimShellComponent` whenever `gridData$` emits.

---

## 8. State Management Summary

| State | Where | Mechanism |
|-------|-------|-----------|
| CMD draft | `EngineSimShellComponent.cmdDraft` | Local property, updated on `CmdSectionComponent` output |
| CMD saved | `EngineSimShellComponent.cmdSaved` | Updated on Apply |
| Form state (Primary) | `FormGroup` created in shell | Passed to `PrimaryCommandsFormComponent` |
| Form state (Secondary) | `FormGroup` created in shell | Passed to `SecondaryCommandsFormComponent` |
| Form snapshots | Plain objects | For Cancel restore |
| Test/Live mode | Shell boolean | Passed as `disabled` input |
| Grid data | `async` pipe on `gridData$` | From `EngineSimDataService` |
| Grid rows | Precomputed in shell | From `gridData$` emissions |

No shared services for state. No BehaviorSubjects. All state is component-local in the shell.

---

## 9. Styling Strategy

- Reuse existing `_dropdowns.scss` global overrides (same dropdown look)
- Add new `_engine-sim.scss` partial for dashboard-specific styles (imported in `styles.scss`)
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

- `shared/engine-sim.api-contract.ts` — wire-format types (response, payload, config)
- `shared/engine-sim.models.ts` — internal view models (CmdSelection, GridColumn, GridRow, FieldConfig)
- `shared/engine-sim.labels.ts` — centralized translation map
- `shared/engine-sim.tokens.ts` — `ENGINE_SIM_API_CONFIG` injection token
- `shared/option-values.ts` — canonical `as const` value maps + derived literal-union types
- `shared/cmd-options.ts` — `CMD_SIDE_OPTIONS`, `CMD_WHEEL_OPTIONS`
- `shared/build-defaults.util.ts` — `buildDefaultValues()` helper
- `boards/primary-commands/{options,fields,columns}.ts` — Primary's 14 fields
- `boards/secondary-commands/{options,fields,columns}.ts` — Secondary's 14 fields
- `engine-sim.module.ts` — empty shell module

**Acceptance criteria:** `ng build` passes. All types/configs importable.

**Tests delivered (6 specs, all green):**
- `shared/build-defaults.util.spec.ts` — pure utility: array cloning, fresh-object-per-call, mixed single/multi defaults

**Invariants enforced by types (no runtime test needed):**
- `FieldConfig = SingleSelectField | MultiSelectField` — narrowing on the `type` literal forces `defaultValue: string` on single fields and `defaultValue: string[]` on multi fields. A wrong-shape default fails compile.
- `LabeledOption = DropdownOption & { abbr: string }` — every option array used by a field is typed as `LabeledOption[]`, so a missing `abbr` (which would render a blank grid cell) fails compile.
- `gridColGroup: 'all8' | 'tll_tlr' | 'gdl' | 'none'` — string literal union; typos fail compile.
- Option `value`s come from canonical `as const` maps in `option-values.ts`, exported as derived literal-union types — drift between boards fails compile.

### Phase 2: Services (S)

- `EngineSimDataService` — GET + WebSocket → `Observable<EngineSimResponse>`
- `EngineSimApiService` — two POST methods
- `grid-data.utils.ts` — pure transformation functions

**Acceptance criteria:** Services injectable. Utils produce correct `GridRow[]` from mock response data. `ng test` passes.

**Tests:**
- `grid-data.utils.spec.ts` — `buildPrimaryRows` maps `mCommands.standardFields` to L1-R4 cells; `buildSecondaryRows` correctly partitions `additionalFields` (8 cols) vs `aCommands` + 5 props (TLL/TLR/GDL); abbreviation lookup uses the right per-board options; missing field keys produce empty strings
- `engine-sim-api.service.spec.ts` — `postPrimary` / `postSecondary` POST to the URLs from the injected `ENGINE_SIM_API_CONFIG` token; payload matches `BoardPostPayload` shape (use `HttpClientTestingModule`)
- `engine-sim-data.service.spec.ts` — emits the GET response first, then merges WebSocket frames; reconnects after WS error (use a fake WebSocket factory and `HttpClientTestingModule`)

### Phase 3: Dumb Components — Grid + Footer + CMD (S-M)

Build the three reusable dumb components that have no board-specific knowledge:

- `StatusGridComponent` — dynamic columns, row labels, column hover, cell click, test IDs
- `BoardFooterComponent` — 3 buttons with outputs and test IDs
- `CmdSectionComponent` — 2 multi-dropdowns with shared selection model

**Acceptance criteria:** Each component renders in isolation with mock inputs. Test IDs present. Column hover works. `ng test` passes.

**Tests:**
- `status-grid.component.spec.ts` — renders `columns.length + 1` columns (label col + data cols); each cell has `data-test-id="grid-{fieldKey}-{colId}"`; cell click sets `selectedCellId`; column hover sets `hoveredColId`
- `board-footer.component.spec.ts` — emits `defaults`, `cancel`, `apply` on the corresponding button clicks; buttons have the expected `data-test-id` attributes
- `cmd-section.component.spec.ts` — emits `selectionChange` with `{ sides, wheels }` when either dropdown changes; respects `disabled` input

### Phase 4: Board Layout Component (S)

- `EngineSimBoardComponent` — sticky header/footer layout with `ng-content` slots
- SCSS for the two-column (form + grid) split, sticky behavior, scroll

**Acceptance criteria:** Content projection works. Sticky header/footer verified. Resize shrinks proportionally.

**Tests:**
- `engine-sim-board.component.spec.ts` — projects content into `boardCmd`, `boardForm`, `boardGrid`, `boardFooter` slots in the right place (assert with a host test component)
- (Layout/sticky behavior is verified visually in Phase 7 — not unit tested)

### Phase 5: Form Components (M)

- `PrimaryCommandsFormComponent` (under `boards/primary-commands/`) — 11 main fields + 3 "Cmd to GS" fields, all from config arrays
- `SecondaryCommandsFormComponent` (under `boards/secondary-commands/`) — 14 fields

Both consume `FormGroup` + `disabled` as inputs. All dropdowns use `formControlName` (CVA).

**Acceptance criteria:** Forms render all fields with correct options and defaults. Disable/enable toggles all controls. Test IDs on every dropdown. `ng test` passes.

**Tests:**
- `primary-commands-form.component.spec.ts` — renders one dropdown per field in `PRIMARY_COMMANDS_ALL_FIELDS`; "Cmd to GS" sub-section renders the 3 `PRIMARY_COMMANDS_CMD_TO_GS_FIELDS`; toggling `disabled` input disables/enables the whole `FormGroup`; every dropdown has `data-test-id="form-{fieldKey}"`
- `secondary-commands-form.component.spec.ts` — same shape for `SECONDARY_COMMANDS_ALL_FIELDS` (no sub-sections)

### Phase 6: Shell Component — Integration (M-L)

- `EngineSimShellComponent` — the smart orchestrator
- Wire everything: tabs, toggle, CMD state, form creation, Apply/Cancel/Defaults, grid data subscription, data transformation
- `EngineSimModule` final wiring — declare all components, import dependencies

**Acceptance criteria:** Full feature works end-to-end. Tab switching preserves CMD. Apply saves, Cancel reverts, Defaults resets. Grid shows live data. Test/Live toggle disables forms. `ng build` clean. `ng test` passes.

**Tests:**
- `engine-sim-shell.component.spec.ts` — Apply on Primary tab calls `EngineSimApiService.postPrimary` with `{ sides, wheels, fields: { ...defaults, ...edits } }`; Cancel restores the form to the snapshot; Defaults resets to `buildPrimaryCommandsDefaults()`; switching tabs preserves `cmdSaved` but not unapplied form edits; toggling test mode off disables both form groups but leaves the grid enabled (use spy services injected via TestBed providers)

### Phase 7: Polish and Verify (S)

- Visual QA — layout, spacing, alignment, sticky behavior
- Resize testing — shrink container, verify proportional behavior
- All `data-test-id` attributes verified
- Full test suite green
- Production build clean

**Tests:** No new tests — this phase is verification only. Confirm `ng test --no-watch --browsers=ChromeHeadless` and `ng build` are both clean.

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
- **Secondary aCommands structure** — The exact shape of `ACommandsData` (5 fields mapped to TLL/TLR/GDL) needs confirmation when we build the data transformation in Phase 2.

---

## Next Steps

1. Review this plan
2. Start implementation with Phase 1 (Models, Enums, Labels)
3. After Phase 1, Phases 2-5 can run in parallel
