# Tasks: Configuration Dashboard

**Feature**: 1-config-dashboard
**Branch**: `1-config-dashboard`
**Generated**: 2026-04-02
**Spec**: [spec.md](./spec.md)
**Plan**: [impl-plan.md](./impl-plan.md)
**Data Model**: [data-model.md](./data-model.md)

---

## Phase 1: Project Setup (Sequential — 1 agent)

**Goal**: Scaffold the Angular 13 project with Angular Material 13 in the existing repo.

**Completion gate**: `ng serve` compiles and shows the default Angular page with dark background.

- [x] T001 Verify Node.js version is compatible with Angular 13 (^12.20.0 || ^14.15.0 || ^16.10.0) by running `node -v`
- [x] T002 Scaffold Angular 13 project by running `npx @angular/cli@13 new angular-13-playground --directory=. --style=scss --routing=false --skip-git=true` in `/Users/yizhaq.baroz/IdeaProjects/angular-13-playground`
- [x] T003 Install Angular Material 13 by running `npx ng add @angular/material@13 --defaults` in project root
- [x] T004 Add Google Fonts link tags for Manrope and Inter to `src/index.html`
- [x] T005 Create component directory structure: `src/app/components/{app-dropdown,top-bar,cmd-form-panel,operations-form-list,left-panel,status-grid,config-dashboard}/`
- [x] T006 Create project-level mocks directory: `src/app/mocks/`
- [x] T007 Create dashboard-shared directories: `src/app/components/config-dashboard/models/` and `src/app/components/config-dashboard/services/`
- [x] T008 Verify `npx ng serve` compiles and runs without errors

---

## Phase 2: Foundation Layer (Parallel — up to 3 agents)

**Goal**: Build the reusable dropdown component, shared service + models, and dark theme. These three streams are fully independent of each other.

**Completion gate**: AppDropdown renders with CVA in isolation, service compiles and tests pass, dark theme applies globally.

### Stream A: AppDropdownModule (Agent A)

**Files touched**: `src/app/components/app-dropdown/*` only

- [x] T008b [P] Define `DropdownOption` interface (co-located with the component) in `src/app/components/app-dropdown/app-dropdown.models.ts`
- [x] T009 [P] Create `AppDropdownModule` that declares and exports `AppDropdownComponent`, imports `MatSelectModule`, `MatFormFieldModule`, `CommonModule`, `ReactiveFormsModule` in `src/app/components/app-dropdown/app-dropdown.module.ts`
- [x] T010 [P] Implement `AppDropdownComponent` with `ControlValueAccessor` (NG_VALUE_ACCESSOR, forwardRef) wrapping `mat-select`. Inputs: `options: DropdownOption[]`, `label: string`, `placeholder: string`. CVA value type: `string`. File: `src/app/components/app-dropdown/app-dropdown.component.ts`
- [x] T011 [P] Create template with `mat-form-field` > `mat-label` + `mat-select` > `mat-option *ngFor` iterating options in `src/app/components/app-dropdown/app-dropdown.component.html`
- [x] T012 [P] Style dropdown to match dark theme: override mat-select colors, use surface tokens, 4px border-radius in `src/app/components/app-dropdown/app-dropdown.component.scss`
- [x] T013 [P] Write unit tests for CVA behavior: writeValue sets selection, registerOnChange fires on select, registerOnTouched fires on blur, setDisabledState toggles mat-select disabled in `src/app/components/app-dropdown/app-dropdown.component.spec.ts`

### Stream B: Models + DashboardStateService (Agent B)

**Files touched**: `src/app/components/config-dashboard/models/*`, `src/app/components/config-dashboard/services/*`, `src/app/mocks/*` only

**Co-location rule**: Dashboard-specific models and services live under `config-dashboard/`. Project-wide mock data lives under `src/app/mocks/`. Component-specific models (e.g., `DropdownOption`) are created by the component's own agent.

- [x] T014 [P] Define shared dashboard interfaces: `DashboardFormValue` in `src/app/components/config-dashboard/models/dashboard-form.models.ts`, and `GridCell`, `GridRow`, `GridData`, `GridColumn` in `src/app/components/config-dashboard/models/grid.models.ts`
- [x] T015 [P] Define dashboard default values: `DEFAULT_FORM_VALUE` in `src/app/components/config-dashboard/models/dashboard-defaults.ts`
- [x] T015b [P] Define project-wide mock data constants (`ACTIONS`, `CMD_OPTIONS`, `OPERATION_OPTIONS`, `GRID_COLUMNS`) in `src/app/mocks/mock-data.ts`
- [x] T016 [P] Create `DashboardStateService` with BehaviorSubjects (`formState$`, `gridData$`, `availableOptions$`) and method `updateFormState(value: DashboardFormValue)` in `src/app/components/config-dashboard/services/dashboard-state.service.ts`
- [x] T017 [P] Implement mock grid data derivation logic: `computeGridData(formValue: DashboardFormValue): GridData` that produces a 10×6 grid derived from form state in `src/app/components/config-dashboard/services/dashboard-state.service.ts`
- [x] T018 [P] Write unit tests for DashboardStateService: initial state emits defaults, updateFormState triggers gridData$ recalculation, computeGridData returns correct dimensions in `src/app/components/config-dashboard/services/dashboard-state.service.spec.ts`

### Stream C: Dark Theme + Typography (Agent C)

**Files touched**: `src/styles.scss`, `src/styles/_variables.scss` only

- [x] T019 [P] Create SCSS variables file with all Stitch surface tokens (`$background: #0e0e0e`, `$surface-container-low: #131313`, `$surface-container: #191a1a`, `$surface-container-high: #1f2020`, `$surface-container-highest: #252626`, `$primary-text: #e7e5e4`, `$secondary-text: #acabaa`, `$primary: #c6c6c7`, `$error: #ee7d77`, `$tertiary: #eff8ff`) in `src/styles/_variables.scss`
- [x] T020 [P] Create custom Angular Material dark theme palette using `mat.define-dark-theme()` with Stitch colors, configure in `src/styles.scss`
- [x] T021 [P] Configure custom typography config with Manrope for display/headline and Inter for body/caption in `src/styles.scss`
- [x] T022 [P] Set global body styles: `background: $background`, `color: $primary-text`, `font-family: 'Inter', sans-serif`, `margin: 0` in `src/styles.scss`
- [x] T023 [P] Verify dark theme renders correctly by running `npx ng serve` and confirming dark background with correct fonts

---

## Phase 2.5: Dashboard Skeleton (Sequential — 1 agent)

**Goal**: Create the `ConfigDashboardComponent` shell with the two-panel flex layout and placeholder content, so the overall structure is visually verifiable before building child components.

**Completion gate**: Skeleton renders with correct two-panel layout, placeholder text in each section, Cancel/Save buttons bottom-right.

- [x] T070 Create `ConfigDashboardModule` importing `CommonModule`, `MatButtonModule` in `src/app/components/config-dashboard/config-dashboard.module.ts`
- [x] T071 Create `ConfigDashboardComponent` as a shell — no form logic, no service wiring yet in `src/app/components/config-dashboard/config-dashboard.component.ts`
- [x] T072 Create template with two-panel flex layout and placeholder sections in `src/app/components/config-dashboard/config-dashboard.component.html`
- [x] T073 Style: two-panel flex layout (40/60 split), dark surface backgrounds, spacing tokens, footer button positioning in `src/app/components/config-dashboard/config-dashboard.component.scss`
- [x] T074 Update `AppModule` to import `ConfigDashboardModule`, place `<app-config-dashboard>` in `app.component.html` in `src/app/app.module.ts`, `src/app/app.component.html`
- [x] T075 Verify skeleton renders correctly with `ng serve`

**Note**: The demo page currently shows the AppDropdown demo. This phase replaces it with the dashboard skeleton. The dropdown demo can be restored on a separate route later if needed.

---

## Phase 3: Component Layer (Parallel — up to 4 agents)

**Goal**: Build all 4 child components. Fully parallel — each agent works in its own module folder. Requires Phase 2 Stream A (AppDropdown) and Stream B (models) to be complete.

**Completion gate**: All 4 components render in isolation, all unit tests pass.

**Post-Phase 3 cleanup**: `CommandPair` is temporarily defined in `config-dashboard/models/dashboard-form.models.ts`. Once Phase 3 Stream B creates the canonical `cmd-form-panel/cmd-form-panel.models.ts`, update `dashboard-form.models.ts` to import `CommandPair` from `../../cmd-form-panel/cmd-form-panel.models` and remove the local duplicate.

### Stream A: TopBarModule (Agent A)

**Files touched**: `src/app/components/top-bar/*` only

- [x] T024 [P] Create `TopBarModule` importing `AppDropdownModule`, `CommonModule`, `MatButtonModule` in `src/app/components/top-bar/top-bar.module.ts`
- [x] T025 [P] Implement `TopBarComponent` (dumb/presentational) with `@Input() selectedAction: string`, `@Input() actionOptions: DropdownOption[]`, `@Output() actionChanged: EventEmitter<string>`, `@Output() resetClicked: EventEmitter<void>` in `src/app/components/top-bar/top-bar.component.ts`
- [x] T026 [P] Create template: flex row with "Action" label + `<app-dropdown>` for action + spacer + "Reset" button in `src/app/components/top-bar/top-bar.component.html`
- [x] T027 [P] Style: full-width bar, `display: flex`, `align-items: center`, `justify-content: space-between`, dark surface background, padding in `src/app/components/top-bar/top-bar.component.scss`
- [x] T028 [P] Write unit tests: renders "Action" label, emits actionChanged when dropdown value changes, emits resetClicked when Reset button clicked in `src/app/components/top-bar/top-bar.component.spec.ts`

### Stream B: CmdFormPanelModule (Agent B)

**Files touched**: `src/app/components/cmd-form-panel/*` only

- [x] T028b [P] Define `CommandPair` interface (co-located with the component) in `src/app/components/cmd-form-panel/cmd-form-panel.models.ts`
- [x] T029 [P] Create `CmdFormPanelModule` importing `AppDropdownModule`, `CommonModule` in `src/app/components/cmd-form-panel/cmd-form-panel.module.ts`
- [x] T030 [P] Implement `CmdFormPanelComponent` with `ControlValueAccessor` emitting `CommandPair`. Input: `@Input() cmdOptions: DropdownOption[]`. File: `src/app/components/cmd-form-panel/cmd-form-panel.component.ts`
- [x] T031 [P] Create template: "CMD" inline label + two `<app-dropdown>` side by side with labels "cmd 1" and "cmd 2" in `src/app/components/cmd-form-panel/cmd-form-panel.component.html`
- [x] T032 [P] Style: horizontal flex layout for dropdowns with gap, padding in `src/app/components/cmd-form-panel/cmd-form-panel.component.scss`
- [x] T033 [P] Write unit tests: CVA writeValue sets both dropdowns, changing either dropdown emits updated CommandPair via onChange, setDisabledState disables both dropdowns in `src/app/components/cmd-form-panel/cmd-form-panel.component.spec.ts`

### Stream C: OperationsFormListModule (Agent C)

**Files touched**: `src/app/components/operations-form-list/*` only

- [x] T034 [P] Create `OperationsFormListModule` importing `AppDropdownModule`, `CommonModule` in `src/app/components/operations-form-list/operations-form-list.module.ts`
- [x] T035 [P] Implement `OperationsFormListComponent` with `ControlValueAccessor` emitting `string[]` (always length 10). Input: `@Input() operationOptions: DropdownOption[]`. File: `src/app/components/operations-form-list/operations-form-list.component.ts`
- [x] T036 [P] Create template: "OPR" heading above + `*ngFor` rendering 10 rows, each with "act N" inline label + `<app-dropdown>` in `src/app/components/operations-form-list/operations-form-list.component.html`
- [x] T037 [P] Style: vertical list layout, heading above, consistent spacing between rows in `src/app/components/operations-form-list/operations-form-list.component.scss`
- [x] T038 [P] Write unit tests: CVA writeValue sets all 10 dropdowns, changing dropdown at index 3 emits updated array with only index 3 changed, setDisabledState disables all 10 dropdowns in `src/app/components/operations-form-list/operations-form-list.component.spec.ts`

### Stream D: StatusGridModule (Agent D)

**Files touched**: `src/app/components/status-grid/*` only

- [x] T039 [P] Create `StatusGridModule` importing `CommonModule` in `src/app/components/status-grid/status-grid.module.ts`
- [x] T040 [P] Implement `StatusGridComponent` (dumb/presentational) with `@Input() gridConfig: GridConfig`, `@Input() gridRows: GridRow[]` in `src/app/components/status-grid/status-grid.component.ts`
- [x] T041 [P] Create template: per row — label+value as plain text (outside grid), status cells in a bordered grid (no headers, no row labels) in `src/app/components/status-grid/status-grid.component.html`
- [x] T042 [P] Style: bordered grid cells, dark background, colored dots for color-type columns, text labels for text-type columns, label+value outside grid with flex alignment in `src/app/components/status-grid/status-grid.component.scss`
- [x] T043 [P] Write unit tests: renders correct number of rows/columns, label+value rendered outside grid, active/inactive cell indicators in `src/app/components/status-grid/status-grid.component.spec.ts`

---

## Phase 4: Dashboard Wiring (Sequential — 1 agent)

**Goal**: Replace skeleton placeholders with real child components. `LeftPanelComponent` owns the left-column `FormGroup` and emits `formChanged` / `saved` / `cancelled`. `ConfigDashboardComponent` is a **layout orchestrator**: composes `TopBar`, `LeftPanel`, and `StatusGrid`, wires `DashboardStateService`, and implements Save/Cancel/Reset.

**Completion gate**: Full dashboard renders with real components, form interactions work end-to-end, grid updates on form changes.

- [ ] T044a Create `LeftPanelModule` importing `CmdFormPanelModule`, `OperationsFormListModule`, `CommonModule`, `ReactiveFormsModule` in `src/app/components/left-panel/left-panel.module.ts`
- [ ] T044b Implement `LeftPanelComponent` — owns `FormGroup` with controls `commands` (FormControl<CommandPair>), `operations` (FormControl<string[]>), initialized from `DEFAULT_FORM_VALUE`; `@Output() formChanged`, `@Output() saved`, `@Output() cancelled`; template wires `<app-cmd-form-panel formControlName="commands">`, `<app-operations-form-list formControlName="operations">` in `src/app/components/left-panel/left-panel.component.ts` (and `.html`/`.scss`/`.spec.ts`)
- [ ] T044 Update `ConfigDashboardModule` to import `TopBarModule`, `LeftPanelModule`, `StatusGridModule`, `ReactiveFormsModule` only (layout orchestrator — **do not** import `CmdFormPanelModule` or `OperationsFormListModule` directly; they come via `LeftPanelModule`) in `src/app/components/config-dashboard/config-dashboard.module.ts`
- [ ] T045 Refactor `ConfigDashboardComponent` to a layout orchestrator: no `FormGroup` for `commands`/`operations` on the dashboard — those live on `LeftPanelComponent`. Coordinate `action` with `TopBar` (e.g. `FormControl<string>` or equivalent `@Input`/`@Output`). Inject `DashboardStateService`. Merge `action` with left-panel values when calling `updateFormState`. File: `src/app/components/config-dashboard/config-dashboard.component.ts`
- [ ] T046 Replace placeholder content in template with `<app-top-bar>`, `<app-left-panel (formChanged)="..." (saved)="..." (cancelled)="...">`, `<app-status-grid [gridData]="gridData$ | async">` in `src/app/components/config-dashboard/config-dashboard.component.html`
- [ ] T047 Implement Save logic: `onSave()` snapshots merged `DashboardFormValue` (`action` + left-panel `FormGroup` value) into `savedBaseline`, marks the involved controls pristine, and coordinates with `LeftPanelComponent` `@Output() saved` where applicable in `src/app/components/config-dashboard/config-dashboard.component.ts`
- [ ] T048 Implement Cancel logic: `onCancel()` restores `savedBaseline` into `action` and the left-panel `FormGroup`, marks pristine, and coordinates with `LeftPanelComponent` `@Output() cancelled` where applicable in `src/app/components/config-dashboard/config-dashboard.component.ts`
- [ ] T049 Implement Reset logic: `onReset()` resets `action` and left-panel form to `DEFAULT_FORM_VALUE` in `src/app/components/config-dashboard/config-dashboard.component.ts`
- [ ] T050 Wire DashboardStateService: subscribe to `(formChanged)` from `<app-left-panel>` (or `valueChanges` on the left `FormGroup` exposed via output), merge with `action`, call `service.updateFormState(value)` on each change, expose `gridData$ = service.gridData$` for the template in `src/app/components/config-dashboard/config-dashboard.component.ts`
- [ ] T051 Wire TopBar: pass current `action` to `selectedAction`, `ACTIONS` to `actionOptions`, handle `(actionChanged)` by updating `action` and `updateFormState`, handle `(resetClicked)` by calling `onReset()` in `src/app/components/config-dashboard/config-dashboard.component.html`
- [ ] T056 Write integration tests: initial load shows all sections, changing operation dropdown updates form value via `LeftPanelComponent`, Save snapshots and Cancel restores, Reset returns to defaults, grid data updates on form changes in `src/app/components/config-dashboard/config-dashboard.component.spec.ts`

---

## Phase 5: Polish & Verify (Sequential — 1 agent)

**Goal**: Visual QA against Stitch design, verify all tests pass, production build succeeds.

**Completion gate**: All tests green, production build clean, visual match with Stitch design.

- [ ] T057 Visual QA: compare rendered dashboard against Stitch screenshot — verify spacing, colors, typography, layout proportions
- [ ] T058 Fine-tune theme SCSS variables if any colors or spacing don't match the Stitch design
- [ ] T059 Verify all unit tests pass by running `npx ng test --watch=false --browsers=ChromeHeadless`
- [ ] T060 Verify production build succeeds by running `npx ng build --configuration production`
- [ ] T061 Clean up any remaining Angular CLI boilerplate files (`src/assets/.gitkeep`, unused `src/environments/` files if not needed)

**Note**: Phase 2.5 replaced the AppDropdown demo page with the dashboard skeleton. If the demo is still needed for reference, it can be restored on a separate route during this phase.

---

## Dependency Graph

```
Phase 1 (Setup)
  │
  ├──► Phase 2 Stream A (AppDropdown)  ──┐
  ├──► Phase 2 Stream B (Models+Service) ─┼──► Phase 2.5 (Skeleton) ──┐
  └──► Phase 2 Stream C (Theme)  ────────┘                            │
                                                                       │
  Phase 2 Stream A (AppDropdown) ──► Phase 3 Streams A,B,C,D ─────────┼──► Phase 4 ──► Phase 5
  Phase 2 Stream B (Models)      ──► Phase 3 Stream D (Grid)          │    (Wiring)    (Polish)
                                          (all 4 parallel)   ─────────┘
```

**Critical path**: Phase 1 → Phase 2A (AppDropdown) → Phase 3 (any component using it) → Phase 4 → Phase 5

**Parallel opportunities**:
- Phase 2: 3 streams fully parallel (T008b-T013 || T014-T018 || T019-T023)
- Phase 2.5: Sequential (T070-T075), can run in parallel with Phase 3 if skeleton is ready
- Phase 3: 4 streams fully parallel (T024-T028 || T028b-T033 || T034-T038 || T039-T043)

**Note**: Phase 2.5 (skeleton) and Phase 3 (components) can overlap — the skeleton only needs Phase 2 complete, not Phase 3. However, Phase 4 (wiring) requires both.

---

## Parallel Execution Examples

### Phase 2 — Launch 3 agents simultaneously:

```
Agent A (start immediately): T008b → T009 → T010 → T011 → T012 → T013
Agent B (start immediately): T014 → T015 → T015b → T016 → T017 → T018
Agent C (start immediately): T019 → T020 → T021 → T022 → T023
```

### Phase 2.5 — Sequential (after Phase 2 completes):

```
Agent A: T070 → T071 → T072 → T073 → T074 → T075
```

### Phase 3 — Launch 4 agents simultaneously (after Phase 2 completes, can overlap with Phase 2.5):

```
Agent A (start immediately): T024 → T025 → T026 → T027 → T028
Agent B (start immediately): T028b → T029 → T030 → T031 → T032 → T033
Agent C (start immediately): T034 → T035 → T036 → T037 → T038
Agent D (start immediately): T039 → T040 → T041 → T042 → T043
```

---

## Implementation Strategy

### MVP Scope

Phase 1 (Setup) + Phase 2 (Foundation) + Phase 3 (Components) + Phase 4 (Integration) = **fully functional dashboard**

Phase 5 (Polish) is incremental refinement.

### Incremental Delivery Order

1. **After Phase 1**: Verifiable — Angular app runs
2. **After Phase 2**: Verifiable — AppDropdown renders standalone, service tests pass, dark theme visible
3. **After Phase 2.5**: Verifiable — Dashboard skeleton renders with two-panel layout and placeholder content
4. **After Phase 3**: Verifiable — each component renders in isolation with correct behavior
5. **After Phase 4**: Verifiable — full dashboard works end-to-end
6. **After Phase 5**: Verifiable — visual polish matches Stitch design, all tests green, production build clean

---

## Summary

| Metric | Value |
|--------|-------|
| Total tasks | 69 |
| Phase 1 (Setup) | 8 tasks |
| Phase 2 (Foundation) | 17 tasks (3 parallel streams, includes co-located model tasks) |
| Phase 2.5 (Skeleton) | 6 tasks (sequential) |
| Phase 3 (Components) | 21 tasks (4 parallel streams, includes co-located model tasks) |
| Phase 4 (Wiring) | 11 tasks (includes `LeftPanelModule` / `LeftPanelComponent`) |
| Phase 5 (Polish) | 6 tasks |
| Max parallel agents | 4 (Phase 3) |
| Parallel tasks | 38 out of 69 (55%) |
| Agent sessions total | ~11 across 6 phases |
