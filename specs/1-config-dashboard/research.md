# Research: Configuration Dashboard

**Feature**: 1-config-dashboard
**Date**: 2026-04-02

---

## R1: Angular 13 Project Scaffold — Exact Versions

**Decision**: Use Angular CLI 13.3.x (latest Angular 13 minor) with TypeScript ~4.6.x

**Rationale**: Angular 13.3.x is the most stable and mature Angular 13 release, with the widest TypeScript support (>=4.4.3 <4.7.0). Using the latest minor avoids known bugs in earlier 13.x releases.

**Exact commands**:
```bash
npx @angular/cli@13 new angular-13-playground --directory=. --style=scss --routing=false --skip-git=true
ng add @angular/material@13 --theme=custom --animations=true
```

**Compatible versions**:
- Node.js: ^12.20.0 || ^14.15.0 || ^16.10.0
- TypeScript: >=4.4.3 <4.7.0 (CLI installs ~4.6.x)
- Angular CLI: 13.3.x
- Angular Material: 13.x (matching Angular version)
- Angular CDK: 13.x (installed with Material)

**Alternatives considered**:
- Angular 13.0.x: Rejected — older, fewer bug fixes, TypeScript ~4.4.3 only
- Angular 14: Rejected — user requires exactly Angular 13

---

## R2: ControlValueAccessor Pattern in Angular 13

**Decision**: Use the standard `NG_VALUE_ACCESSOR` provider pattern with `forwardRef`

**Rationale**: This is the only CVA pattern available in Angular 13 (standalone components with CVA are Angular 14+). Works reliably with Reactive Forms.

**Pattern**:
```typescript
@Component({
  selector: 'app-dropdown',
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => AppDropdownComponent),
    multi: true
  }]
})
export class AppDropdownComponent implements ControlValueAccessor { ... }
```

**Alternatives considered**:
- Directive-based CVA: Rejected — component-based is cleaner for this use case
- ngDefaultControl: Rejected — doesn't support custom behavior

---

## R3: Module-Per-Component File Structure

**Decision**: Each component in its own folder with a dedicated NgModule

**Rationale**: Maps 1:1 to standalone components in Angular 14+. Each module imports only what it needs, keeping the dependency graph explicit.

**Structure**:
```
src/app/components/
├── app-dropdown/
│   ├── app-dropdown.component.ts
│   ├── app-dropdown.component.html
│   ├── app-dropdown.component.scss
│   ├── app-dropdown.component.spec.ts
│   └── app-dropdown.module.ts
├── top-bar/
│   └── ...
├── cmd-form-panel/
│   └── ...
├── operations-form-list/
│   └── ...
├── left-panel/
│   └── ...
├── status-grid/
│   └── ...
└── config-dashboard/
    └── ...
```

**Alternatives considered**:
- Shared feature module: Rejected — doesn't map cleanly to standalone migration
- Flat file structure: Rejected — harder to navigate with 7+ feature folders

---

## R4: Dark Theme Implementation

**Decision**: Custom Angular Material theme using the Stitch design system colors

**Rationale**: Angular Material 13 supports custom SCSS themes via `@angular/material/theming`. We define a custom dark palette matching the Stitch "Obsidian Monolith" design.

**Key tokens to map**:
- Background: `#0e0e0e`
- Surface containers: `#131313`, `#191a1a`, `#1f2020`, `#252626`
- Primary text: `#e7e5e4`
- Secondary text: `#acabaa`
- Primary: `#c6c6c7`
- Error: `#ee7d77`
- Accent/Tertiary: `#eff8ff`

**Fonts**: Google Fonts — Manrope (headlines), Inter (body/labels)

**Alternatives considered**:
- Pre-built dark theme: Rejected — doesn't match the Stitch design
- CSS-only theming: Rejected — loses Angular Material's theming utilities

---

## R5: Shared State Service Pattern

**Decision**: Injectable service with BehaviorSubjects, provided at module/root level

**Rationale**: Standard Angular pattern for sibling communication. BehaviorSubjects provide initial values and late subscribers always get the latest state. The service abstracts the data source, making future backend integration a single-point change.

**Alternatives considered**:
- NgRx store: Rejected — overkill for a single-page dashboard with simple state
- EventBus pattern: Rejected — less type-safe, harder to debug

---

## R6: Parallel Agent Execution Strategy

**Decision**: Maximize parallelism by identifying independent work streams that don't share file dependencies

**Rationale**: The module-per-component architecture naturally creates independent file boundaries. Components that don't import each other can be built simultaneously by separate agents.

**Parallel groups identified** (see impl-plan.md for full details):
- Phase 0 (Project Setup): Sequential — must complete before any component work
- Phase 1 (Foundation): `AppDropdownModule` + `DashboardFormService` + `StatusGridService` + dark theme — can partially parallelize
- Phase 3 (Leaf + composer): `TopBarModule`, `CmdFormPanelModule`, `OperationsFormListModule`, `StatusGridModule` in parallel (where file boundaries allow), then `LeftPanelModule` after CmdFormPanel + OperationsFormList exist
- Phase 4 (Integration): `ConfigDashboardModule` wiring — sequential, depends on `LeftPanelModule` + TopBar + StatusGrid

**Alternatives considered**:
- Fully sequential: Rejected — misses the parallelism opportunity from modular architecture
- All components in parallel: Rejected — CmdFormPanel and OperationsFormList depend on AppDropdown being done first; LeftPanel depends on CmdFormPanel + OperationsFormList modules

---

## R7: External Template & Stylesheet Files

**Decision**: All components use external template (`.html`) and stylesheet (`.scss`) files — no inline `template:` or `styles:` in the `@Component` decorator

**Rationale**: External files keep each source file focused on a single concern (logic, markup, or styling). This aligns with the module-per-component pattern where each component folder is a self-contained, portable unit. It also improves readability, editor support (syntax highlighting, linting), and makes diffs cleaner.

**Alternatives considered**:
- Inline templates for simple components: Rejected — consistency across all components is preferred, and even simple components grow over time

---

## R8: Directive-Based CVA with Separate Single/Multi Components

**Decision**: Extract CVA logic from `AppDropdownComponent` into a standalone `AppDropdownCvaDirective`, and create a separate `AppMultiDropdownComponent` for multi-select — both sharing the CVA directive via a `DropdownHost` injection token.

**Rationale**: The original approach embedded CVA logic directly in `AppDropdownComponent`. Adding multi-select would have required either a single component with a `[multiple]` flag (sacrificing type safety — `string` vs `string[]`) or duplicating CVA boilerplate across two components. The directive-based approach solves both:

1. **Type safety**: `AppDropdownComponent` has `value: string` and `changed: EventEmitter<string>`, while `AppMultiDropdownComponent` has `value: string[]` and `changed: EventEmitter<string[]>`. No runtime type ambiguity.
2. **DRY CVA logic**: A single `AppDropdownCvaDirective` handles `writeValue`, `registerOnChange`, `registerOnTouched`, and `setDisabledState` for both components via the shared `DropdownHost` interface.
3. **Clean separation**: Components are purely presentational (`@Input`/`@Output`). The CVA directive only activates when a form directive is present.
4. **Reusability**: Any future dropdown-like component (e.g., searchable dropdown, tree select) can provide `DROPDOWN_HOST` and instantly work with reactive forms.

**Injection strategy**: Each component provides itself under the `DROPDOWN_HOST` injection token. The directive injects `DROPDOWN_HOST` to access the host component generically, without knowing the concrete type.

**Pattern source**: Inspired by HiBob web client's `BaseFormElement` abstraction and the separation between `b-single-select` / `b-multi-select` components.

**Alternatives considered**:
- Single component with `[multiple]` flag: Rejected — loses type safety between `string` and `string[]`, requires runtime checks
- CVA directly on each component: Rejected — duplicates boilerplate across single/multi components
- Keep CVA on `AppDropdownComponent` only: Rejected — doesn't support multi-select use case

---

## R9: Separate Modules per Component + Global Dropdown Styles

**Decision**: Split the single `AppDropdownModule` into three separate modules (`AppDropdownModule`, `AppMultiDropdownModule`, `AppDropdownCvaModule`), each in its own folder. Replace all `::ng-deep` styles with a global `.app-dropdown-field` CSS class in `src/styles/_dropdowns.scss`.

**Rationale**:

1. **1:1 standalone migration**: Each module maps directly to one standalone component/directive in Angular 14+. Migration becomes: delete the module file, add `standalone: true`, done. No untangling shared modules.
2. **Granular imports**: Consumers import only what they need — a project using only single-select doesn't pull in multi-select or CVA code.
3. **No `::ng-deep`**: `::ng-deep` is deprecated. Moving dropdown styles to a global class (`.app-dropdown-field`) applied directly on the `mat-form-field` element avoids view encapsulation hacks entirely. The styles use SCSS variables from `_variables.scss` for consistency.

**Folder structure**:
```
components/
├── app-dropdown/           (AppDropdownModule + models)
├── app-multi-dropdown/     (AppMultiDropdownModule)
└── app-dropdown-cva/       (AppDropdownCvaModule)
```

**Import graph**: `app-multi-dropdown` and `app-dropdown-cva` import TypeScript types from `../app-dropdown/app-dropdown.models` — no Angular module dependency between them.

**Alternatives considered**:
- Keep all in one module: Rejected — harder to migrate to standalone, forces consumers to import everything
- Move models to a separate `dropdown-models/` folder: Rejected — over-engineering; models are small and belong with the foundational component
- Keep `::ng-deep` with separate modules: Rejected — `::ng-deep` is deprecated and global classes are cleaner

---

## R10: Label Placement — Inline vs. Section Heading

**Decision**: Two label patterns are used depending on context:
1. **Inline (left-side)**: Label sits to the left of the input in a flex row. Used for: "Action" (TopBar), "CMD" (CmdFormPanel), "act 1"–"act 10" (OperationsFormList rows).
2. **Section heading (above)**: Label sits above its section content. Used for: "OPR" / "OPERATIONS" label above the 10 operations rows.

**Rationale**: The CMD section has a compact layout where "CMD" + two dropdowns fit on one line, so inline placement works naturally. The OPERATIONS section has 10 rows — placing "OPR" inline to the left would create awkward vertical alignment with a tall block of content. A heading above is the cleaner pattern for a form section with many rows.

**Implementation**: Inline labels use a plain `<label>` element outside the `mat-form-field`, wrapped in a `.app-dropdown-wrapper` flex container. Section headings use a styled `<span>` or `<label>` above the form rows. Global styles in `src/styles/_dropdowns.scss` handle the inline layout. The `@Input() label` property on `AppDropdownComponent` and `AppMultiDropdownComponent` drives the inline label.

**Alternatives considered**:
- Floating `<mat-label>` inside `mat-form-field`: Rejected — doesn't match the design's external label pattern
- All labels inline: Rejected — "OPR" inline with 10 rows creates poor visual balance
- All labels above: Rejected — "CMD" inline with two dropdowns is a better use of horizontal space

---

## R11: Right Panel — Confirmed State via WebSocket (Not Derived from Form)

**Decision**: The right panel (StatusGrid) shows the **server-confirmed** state, not the live form state. It updates only when a WebSocket `FieldUpdate` message arrives after a save operation.

**Rationale**: The dashboard represents a two-phase data flow: (1) the user edits the form on the left, (2) the server processes the save and pushes confirmed updates to the right. This separation ensures the right panel always reflects what the server has acknowledged, which is critical for distributed systems where multiple users or background processes may affect state.

**Data model**: `GridRow` now includes `field` (form path for matching), `label`, `confirmedValue`, and `cells`. On initial load, `gridRows$` is seeded from `DEFAULT_FORM_VALUE` with empty statuses.

**Update mechanism**: `FieldUpdate` messages support three shapes flexibly:
1. **Full row** — value + all statuses replaced
2. **Value only** — confirmedValue updated, statuses unchanged  
3. **Single cell** — one status column toggled, everything else unchanged

The handler in `StatusGridService.applyUpdate()` merges each message into the existing `gridRows$` using `field` as the lookup key. Only specified fields in the message are changed; everything else is preserved.

**Alternatives considered**:
- Derive grid data from form state (immediate mirror): Rejected — doesn't reflect server-confirmed reality; unreliable in multi-user or async-processing scenarios
- Full state replacement on every WebSocket message: Rejected — wastes bandwidth, prevents partial updates, and makes the system less flexible
- Fixed message shape (always send all fields): Rejected — forces the server to compute and send unchanged data; partial updates are more efficient and simpler to implement on the backend

---

## R12: Configuration-Driven Grid Columns

**Decision**: Grid columns (red, yellow, green, N, P, L) are defined by a `GridConfig` object, not hardcoded.

**Rationale**: The number and type of status columns may change. A configuration-driven approach means adding, removing, or reordering columns requires modifying only the config object (or eventually, an API response). Components, templates, and the WebSocket handler work generically with any number of columns.

**Implementation**: `GridConfig.columns: GridColumn[]` defines the columns. `GridRow.cells` is an array matching columns by index. `FieldUpdate.statuses` is a `Record<string, boolean>` keyed by `GridColumn.id`. The handler looks up cells by column id to apply partial updates.

**Alternatives considered**:
- Hardcoded 6-column layout: Rejected — rigid, would require template/component changes to modify columns
- Dynamic column discovery from WebSocket messages: Rejected — too implicit, columns should be declared upfront for rendering

---

## R13: Split Services — DashboardFormService + StatusGridService

**Decision**: Split the single `DashboardStateService` into two dedicated services: `DashboardFormService` (left panel) and `StatusGridService` (right panel).

**Rationale**: The left and right panels are architecturally independent — they don't share state after initial load. The left panel is form-driven (reactive forms, save/cancel/reset, saved baseline). The right panel is WebSocket-driven (confirmed state, `applyUpdate()` merge logic). Combining them in one service violates single-responsibility and makes testing harder.

**DashboardFormService** (`config-dashboard/services/dashboard-form.service.ts`):
- `formState$: BehaviorSubject<DashboardFormValue>` — live form state
- `availableOptions$` — derived from commands (future: filter operation options based on CMD selection)
- `savedBaseline` — snapshot of last saved form state
- `saveConfig(form)` — POST to mock API
- `cancelChanges()` — restore savedBaseline
- `resetToDefaults()` — reset to DEFAULT_FORM_VALUE

**StatusGridService** (`config-dashboard/services/status-grid.service.ts`):
- `gridRows$: BehaviorSubject<GridRow[]>` — confirmed state, seeded from defaults
- `applyUpdate(update: FieldUpdate)` — merge WebSocket message into gridRows$
- `connect()` — subscribe to WebSocket (mock for now)
- `resetToDefaults()` — re-seed from DEFAULT_FORM_VALUE with empty statuses

**Interaction point**: `ConfigDashboardComponent` injects both and orchestrates layout; `LeftPanelComponent` owns the CMD + OPERATIONS `FormGroup` and emits `saved` / `formChanged` upward. On save: dashboard calls `formService.saveConfig()`, which triggers the server, which pushes a WebSocket `FieldUpdate` that `gridService` handles. Clean boundary.

**Alternatives considered**:
- Single `DashboardStateService` handling both: Rejected — violates SRP, harder to test, couples independent concerns
- Three services (adding a separate API service): Rejected — over-engineering at this stage; the API call is simple enough to live in `DashboardFormService`. Can extract later if needed

---

## R14: LeftPanelComponent — Form Ownership & Dashboard De-responsibilization

**Decision**: Introduce `LeftPanelComponent` + `LeftPanelModule` as the owner of the reactive `FormGroup` for `commands` and `operations`. `ConfigDashboardComponent` becomes a layout orchestrator only: it does **not** declare a `FormGroup` and does **not** import `ReactiveFormsModule`. The dashboard passes `@Input cmdOptions`, `@Input operationOptions`, and `@Input formValue` into the left panel and listens to `@Output formChanged`, `@Output saved`, and `@Output cancelled`.

**Rationale**:

1. **Form ownership delegation**: CMD + OPERATIONS are one visual card with shared footer actions. Co-locating the `FormGroup` with that subtree matches the UI boundary and keeps CVA `formControlName` wiring local to `LeftPanelComponent`'s template.
2. **Future conditional sections**: Extra form regions (feature flags, roles, experiments) can live under `LeftPanelComponent` with `*ngIf` without inflating `ConfigDashboardComponent`.
3. **@Output instead of another CVA**: Making the entire left panel a `ControlValueAccessor` would couple the dashboard to a single opaque control API and complicate top-bar `action` handling. Explicit outputs preserve a clear contract (`saved` / `cancelled` / `formChanged`) while the dashboard continues to coordinate `DashboardFormService` and `StatusGridService`.

**Alternatives considered**:
- **FormGroup stays on `ConfigDashboardComponent`**: Rejected for this revision — dashboard grows with every left-panel concern; harder to add conditional inner sections cleanly.
- **Left panel as CVA for full `DashboardFormValue`**: Rejected — forces awkward bridging for `action` (top bar) vs. nested values and obscures save/cancel semantics.
- **Single mega-template in dashboard**: Rejected — violates module-per-component portability and blurs layout vs. form responsibilities.
