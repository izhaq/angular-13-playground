---
name: angular-engineering
description: >-
  Angular-specific engineering best practices for production-quality applications.
  Covers reactive forms, RxJS patterns, change detection, content projection,
  services, Material theming, and layout strategies. Extends the
  frontend-ui-engineering skill with Angular-only depth. Use when building or
  modifying Angular components, services, forms, or templates. Use when reviewing
  Angular code or debugging Angular-specific issues.
---

# Angular Engineering

## Overview

Angular-specific best practices for building production-quality applications. This skill extends [frontend-ui-engineering](../frontend-ui-engineering/SKILL.md) — read that skill first for general UI quality, accessibility, design-system adherence, and the AI-aesthetic checklist. Everything below is Angular-only.

**Version awareness:** Before writing code, check `package.json` for the project's Angular version. APIs differ across major versions. When this skill shows patterns, it notes version boundaries. Always prefer the pattern that matches the project version.

## When to Use

- Building or modifying Angular components, services, or modules
- Working with reactive forms, validation, or `ControlValueAccessor`
- Managing subscriptions, WebSocket streams, or shared state with RxJS
- Debugging change detection or performance issues
- Structuring feature modules for portability / migration
- Building layout components with content projection
- Theming or overriding Angular Material styles

---

## Reactive Forms

Reactive forms are the default for any form with validation, dynamic fields, or programmatic control.

### FormGroup Construction

```typescript
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsFormComponent implements OnInit {
  form!: FormGroup;

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(100)]],
      mode: ['normal'],
      tags: [[] as string[]],
    });
  }
}
```

### Disabling / Enabling Entire Forms

```typescript
this.form.disable();
this.form.enable();
```

`form.value` returns only enabled controls. Use `form.getRawValue()` to include disabled controls.

### Form Reset and Snapshots

```typescript
private savedState: Record<string, unknown> = {};

onSaveSuccess(): void {
  this.savedState = this.form.getRawValue();
}

onCancel(): void {
  this.form.reset(this.savedState);
}

onDefaults(): void {
  this.form.reset(this.defaultValues);
}
```

### ControlValueAccessor (CVA)

Use CVA to wrap custom components (like a styled dropdown) so they work with `formControlName` / `formControl` / `ngModel`.

Key rules:
- Implement `writeValue`, `registerOnChange`, `registerOnTouched`, `setDisabledState`.
- Provide `NG_VALUE_ACCESSOR` with `multi: true` and `forwardRef`.
- Call `onTouched` on blur or selection, not just on value change.
- Unsubscribe from internal observables in `ngOnDestroy`.

### Typed Forms (Angular 14+)

Angular 14 introduced strictly typed forms. If the project is v14+, prefer `FormGroup<{ name: FormControl<string> }>` over untyped `FormGroup`. For v13 and below, use the untyped API and rely on explicit type annotations where helpful.

---

## RxJS Patterns

### Subscription Management

Never leave subscriptions open. Choose one strategy per component and be consistent across the project.

**Strategy 1 — `async` pipe (preferred for templates):**

```typescript
@Component({
  template: `
    <div *ngIf="data$ | async as data">{{ data.name }}</div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DataDisplayComponent {
  data$ = this.service.getData();
  constructor(private service: DataService) {}
}
```

**Strategy 2 — `takeUntil` with a destroy subject (for imperative subscriptions):**

```typescript
export class DataHandlerComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  ngOnInit(): void {
    this.service.getData()
      .pipe(takeUntil(this.destroy$))
      .subscribe(data => this.handleData(data));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
```

**Strategy 3 — `DestroyRef` + `takeUntilDestroyed` (Angular 16+):**

```typescript
export class DataHandlerComponent {
  constructor(private service: DataService, private destroyRef: DestroyRef) {
    this.service.getData()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(data => this.handleData(data));
  }
}
```

Use Strategy 1 whenever possible. Fall back to Strategy 2 for projects on Angular < 16. Never mix strategies in the same component.

### Observable Composition

```typescript
combined$ = combineLatest([this.filters$, this.sort$]).pipe(
  map(([filters, sort]) => ({ filters, sort }))
);

refreshed$ = this.trigger$.pipe(
  switchMap(params => this.http.get('/api/items', { params }))
);

live$ = merge(this.initialLoad$, this.realtimeUpdates$);
```

### WebSocket Service Pattern

```typescript
@Injectable()
export class RealtimeService {
  connect(url: string): Observable<unknown> {
    return new Observable(subscriber => {
      const ws = new WebSocket(url);
      ws.onmessage = event => subscriber.next(JSON.parse(event.data));
      ws.onerror = event => subscriber.error(event);
      ws.onclose = () => subscriber.complete();
      return () => ws.close();
    }).pipe(
      share(),
      retry({ delay: 3000 })
    );
  }
}
```

`share()` prevents multiple connections when multiple subscribers exist. The teardown function in the Observable constructor closes the socket on unsubscribe.

### Error Handling in Streams

```typescript
this.service.save(payload).pipe(
  catchError(err => {
    this.notifyError(err);
    return EMPTY;
  })
).subscribe(() => this.onSaveSuccess());
```

Never let errors silently kill a stream. Use `catchError` to handle and recover, or return `EMPTY` / `of(fallback)` to keep the outer stream alive.

---

## Change Detection

### OnPush Everywhere

Every component must use `ChangeDetectionStrategy.OnPush`.

`OnPush` triggers change detection only when:
1. An `@Input()` reference changes (not mutations).
2. An event handler fires in the component's template.
3. An `async` pipe receives a new emission.
4. `ChangeDetectorRef.markForCheck()` is called manually.

### Common OnPush Pitfalls

```typescript
// WRONG: mutating — OnPush won't detect
this.items.push(newItem);

// RIGHT: new reference
this.items = [...this.items, newItem];
```

```typescript
// WRONG: assigning without notifying change detection
ngOnInit() {
  this.service.getData().subscribe(data => {
    this.data = data;
  });
}

// RIGHT: use async pipe, or markForCheck after assignment
ngOnInit() {
  this.service.getData()
    .pipe(takeUntil(this.destroy$))
    .subscribe(data => {
      this.data = data;
      this.cdr.markForCheck();
    });
}
```

---

## Content Projection

Use `ng-content` to build layout components that don't know about their children.

### Basic Projection

```typescript
@Component({
  selector: 'app-panel',
  template: `
    <div class="panel">
      <ng-content></ng-content>
    </div>
  `,
})
export class PanelComponent {}
```

### Named Slots (Multi-Slot Projection)

```typescript
@Component({
  selector: 'app-sticky-layout',
  template: `
    <div class="sticky-layout">
      <header class="sticky-layout__header">
        <ng-content select="[layoutHeader]"></ng-content>
      </header>
      <main class="sticky-layout__body">
        <ng-content select="[layoutBody]"></ng-content>
      </main>
      <footer class="sticky-layout__footer">
        <ng-content select="[layoutFooter]"></ng-content>
      </footer>
    </div>
  `,
})
export class StickyLayoutComponent {}
```

Usage:

```html
<app-sticky-layout>
  <div layoutHeader>...</div>
  <div layoutBody>...</div>
  <div layoutFooter>...</div>
</app-sticky-layout>
```

This keeps layout components reusable — the parent decides what goes in each slot.

---

## Services

### Single Responsibility

Each service does one thing:
- A data service fetches and streams data (GET + WebSocket).
- An API service sends commands (POST / PUT / DELETE).
- Don't mix HTTP calls with business logic or UI state in the same service.

### Provide in Feature Module, Not Root

For feature-scoped services that shouldn't leak to other modules:

```typescript
@NgModule({
  providers: [FeatureDataService, FeatureApiService],
})
export class FeatureModule {}
```

Use `providedIn: 'root'` only for truly app-wide singletons (auth, logging, global config).

### BehaviorSubject for Shared State

```typescript
@Injectable()
export class SharedSelectionService {
  private readonly selectionSubject = new BehaviorSubject<Selection>(INITIAL);

  readonly selection$ = this.selectionSubject.asObservable();

  get current(): Selection {
    return this.selectionSubject.getValue();
  }

  update(value: Selection): void {
    this.selectionSubject.next(value);
  }
}
```

Only expose the observable publicly. Keep `next()` private behind a method so consumers can't bypass validation.

---

## Material Theming

### Angular 13 and Below

```scss
@use '@angular/material' as mat;

$primary: mat.define-palette(mat.$indigo-palette);
$accent: mat.define-palette(mat.$pink-palette, A200, A100, A400);
$theme: mat.define-dark-theme((
  color: (primary: $primary, accent: $accent),
));

@include mat.all-component-themes($theme);
```

### Angular 15+

```scss
@use '@angular/material' as mat;

$theme: mat.define-theme((
  color: (
    theme-type: dark,
    primary: mat.$indigo-palette,
  ),
));

html { @include mat.all-component-themes($theme); }
```

### Overriding Material Styles

Prefer global scoped selectors over `::ng-deep`:

```scss
.my-panel-class .mat-option {
  font-size: 0.875rem;
}
```

If you must override from a component, use `ViewEncapsulation.None` on a wrapper class — not `::ng-deep`, which is deprecated.

---

## Module Architecture

### Feature Module Pattern

```typescript
@NgModule({
  declarations: [
    FeatureShellComponent,
    ChildAComponent,
    ChildBComponent,
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatTabsModule,
    MatButtonModule,
  ],
  exports: [FeatureShellComponent],
  providers: [FeatureDataService, FeatureApiService],
})
export class FeatureModule {}
```

Rules:
- Import only what the feature needs.
- Export only the entry-point component.
- Declare every component used in this feature's templates.
- Feature-scoped services go in `providers` here, not `providedIn: 'root'`.

### Standalone Components (Angular 14+)

If the project uses Angular 14+, prefer standalone components with `imports` on the component decorator instead of NgModules. For v13 and below, use the module pattern above.

---

## Layout Strategies

### Sticky Header + Scrollable Body + Sticky Footer

```scss
:host {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.layout-header {
  flex-shrink: 0;
}

.layout-body {
  flex: 1;
  overflow-y: auto;
}

.layout-footer {
  flex-shrink: 0;
}
```

The parent must have a fixed or constrained height. `overflow: hidden` on the host prevents double scrollbars.

### Fixed-Dimension Containers with Resize Support

For UIs that live inside a fixed container but must handle resizing (content shrinks proportionally, layout order stays the same):

```scss
:host {
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}
```

- Use `%` and `fr` units inside the container, not fixed `px` for child layout.
- Use `min-width: 0` on flex/grid children to allow shrinking below content size.
- Use `overflow: hidden` or `text-overflow: ellipsis` to handle text overflow gracefully.
- Test at the minimum expected size to ensure nothing breaks or overlaps.

### Side-by-Side Layout (Two Panels)

```scss
.split-content {
  display: flex;
  flex: 1;
  min-height: 0;
  gap: $spacing-sm;
}

.panel-left {
  flex: 0 0 auto;
  width: 45%;
  min-width: 0;
  overflow-y: auto;
}

.panel-right {
  flex: 1;
  min-width: 0;
  overflow: auto;
}
```

### Dynamic Grid Columns

```typescript
@Component({
  selector: 'app-data-grid',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DataGridComponent implements OnChanges {
  @Input() columns: GridColumn[] = [];
  @Input() rows: GridRow[] = [];

  gridTemplateColumns = '';

  ngOnChanges(): void {
    this.gridTemplateColumns = `auto repeat(${this.columns.length}, minmax(0, 1fr))`;
  }

  trackByColId = (_: number, col: GridColumn) => col.id;
  trackByRowId = (_: number, row: GridRow) => row.id;
}
```

```html
<div class="data-grid" [style.grid-template-columns]="gridTemplateColumns">
  <div class="grid-header-blank"></div>
  <div *ngFor="let col of columns; trackBy: trackByColId" class="grid-header">
    {{ col.label }}
  </div>
  <ng-container *ngFor="let row of rows; trackBy: trackByRowId">
    <div class="grid-label">{{ row.label }}</div>
    <div *ngFor="let col of columns; trackBy: trackByColId" class="grid-cell">
      {{ row.values[col.id] }}
    </div>
  </ng-container>
</div>
```

Precompute `gridTemplateColumns` in `ngOnChanges` — not via a getter — to avoid function calls on every change detection cycle. Use `minmax(0, 1fr)` so columns shrink evenly when the container is resized.

---

## Performance

### trackBy on Every *ngFor

```html
<div *ngFor="let item of items; trackBy: trackById">{{ item.name }}</div>
```

```typescript
trackById = (_: number, item: { id: string | number }) => item.id;
```

Without `trackBy`, Angular destroys and recreates every DOM node on change.

### Avoid Function Calls in Templates

```html
<!-- BAD: runs on every change detection cycle -->
<div>{{ getFullName() }}</div>
<div [style.grid-template-columns]="computeColumns()"></div>

<!-- GOOD: precomputed property or pipe -->
<div>{{ fullName }}</div>
<div [style.grid-template-columns]="gridTemplateColumns"></div>
```

If transformation logic is reusable, write a pure `@Pipe` — Angular caches pure pipe results.

### Lazy Load Feature Modules

```typescript
{ path: 'feature', loadChildren: () =>
    import('./features/feature/feature.module').then(m => m.FeatureModule) }
```

---

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "Default change detection is fine" | OnPush is trivial to add upfront and painful to retrofit. It catches mutation bugs early. |
| "I'll clean up subscriptions later" | Leaked subscriptions cause memory leaks and ghost updates. Use `takeUntil` or `async` pipe from the start. |
| "Template-driven forms are simpler" | They are — until you need dynamic controls, cross-field validation, or programmatic disable. Reactive forms scale; template-driven don't. |
| "I'll add trackBy when it's slow" | Without `trackBy`, every list re-render destroys and recreates DOM nodes. Add it once, prevent the problem forever. |
| "This service can do both" | Fat services that mix data fetching, business logic, and UI state are the #1 source of hard-to-test Angular code. |
| "::ng-deep is just easier" | It's deprecated and bleeds styles globally. Global scoped selectors or `ViewEncapsulation.None` are the correct alternatives. |

---

## Angular-Specific Red Flags

- Subscribing without unsubscribing (memory leaks)
- Using `Default` change detection without a reason
- Fat services mixing HTTP, business logic, and UI state
- Template-driven forms for complex forms
- Direct DOM access (`document.querySelector`, `ElementRef.nativeElement`) instead of Angular APIs
- `::ng-deep` for routine styling
- Mutable state updates with `OnPush` (pushing to arrays, mutating objects)
- Components over 200 lines
- Nested subscribes — use `switchMap` / `mergeMap` instead
- `any` types on `@Input()` / `@Output()` — always type the public API
- Function calls or getters in templates (use precomputed properties or pipes)
- Feature services in `providedIn: 'root'` when they should be module-scoped

---

## Verification

After building Angular features:

- [ ] All components use `OnPush` change detection
- [ ] All subscriptions are cleaned up (`async` pipe or `takeUntil`)
- [ ] All `*ngFor` directives have `trackBy`
- [ ] No function calls or getters in templates (precomputed properties or pipes)
- [ ] Forms use Reactive Forms, not template-driven
- [ ] Services are single-responsibility and scoped correctly
- [ ] No `::ng-deep` — styling done via global scoped selectors or `ViewEncapsulation.None`
- [ ] Content projection used for layout components (not mega-input components)
- [ ] Feature module is self-contained and exportable
- [ ] Code works with the project's actual Angular version
- [ ] Container resizes gracefully — content shrinks, layout order preserved
