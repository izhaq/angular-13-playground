# Cell Flash on Change — Spec

**Feature**: `cell-flash-on-change`
**Date**: 2026-05-07
**Status**: Draft (awaiting human review)
**Stack**: Angular 13.3, RxJS 7.5, Jasmine + Karma. No new runtime dependencies.

> **This spec ships TWO parallel directives** that meet the exact same success criteria via different mechanisms:
> - **Version A** — `[appFlashOnChangeCss]` — CSS `@keyframes` + `setTimeout` (wrapped in `NgZone.runOutsideAngular`)
> - **Version B** — `[appFlashOnChangeWaapi]` — Web Animations API (`Element.animate()`), no `setTimeout`
>
> Both are shipped together so they can be compared side-by-side on the demo page. The consumer picks one; the loser is deleted post-evaluation.

---

## 1. Objective

### What
Two Angular **attribute directives** that briefly highlight the host element whenever its watched primitive value **actually changes** (`!Object.is(prev, next)`), then fade the highlight back to transparent over a configurable duration. Same public input contract; different DOM-level mechanism under the hood.

### Why
A large grid is updated from a WebSocket whose payload contains the **entire table on every tick** — both cells whose data changed and cells that did not. Without a visual cue, users can't tell which cells are new information vs. unchanged data being re-broadcast. Hand-rolling per-cell `ngOnChanges` + class toggling at every call site is error-prone (leaked timers, overlapping flashes, broken OnPush). One directive, applied once per cell, solves it for the whole table.

### Why two implementations
There are two defensible technical answers — `setTimeout` + CSS, vs. WAAPI — with different trade-offs in **testability, themeability, zone behavior, and code surface**. Shipping both lets the team evaluate them in real conditions (the demo grid renders both, identical buttons drive both) and pick deliberately rather than by guess.

### Who
Operators monitoring real-time tabular data. First consumer is the `system-experiments` board grids in this repo, but the directives are domain-agnostic.

### Success criteria (measurable, testable — both versions must pass all of these)

1. **Value change** → host element shows a gentle amber highlight that fades to transparent over `flashDurationMs` (default 10 000 ms).
2. **Same value re-set** (websocket re-broadcast: `"5"` → `"5"`) → no highlight, no DOM mutation, no work scheduled.
3. **First emission** (`undefined` / unset → first real value) → no highlight (avoids a wave of flashes on initial table render).
4. **Custom duration** — `[flashDurationMs]="3000"` flashes for 3 s instead of 10 s.
5. **Mid-flash change** — a new value mid-fade cancels the in-flight flash and restarts cleanly. No overlapping animations, no leaked timers.
6. **`prefers-reduced-motion: reduce`** users get a **static** colored hold for the same duration (still signals "this changed", no motion).
7. **Performance** — animation runs on the compositor (GPU). 1 000 cells flashing simultaneously must not block the main thread.
8. **Cleanup** — `ngOnDestroy` cancels any in-flight animation/timer and clears the highlight. No `NG0` warnings, no zone-leak in `fakeAsync` tests.
9. **Falsy primitives** (`0`, `false`, `""`) are real values — `0 → 0` does not flash but `0 → 1` does.
10. **Demo page** — a new section in `/demo` renders both directives side-by-side on identical data so a reviewer can verify they behave identically (and pick one).

### Explicit non-goals
- Not a generic animation framework — only the "value changed → flash" use case.
- Not a `ControlValueAccessor`, doesn't touch forms.
- Not a component (no template, no `ng-content`) — pure attribute directives.
- No `Output` events in v1 (`(flashed)` is plausible later but YAGNI today).
- No deep object/array comparison (callers confirmed cells are primitives — `string | number | boolean | null`).
- Both directives ship together for evaluation. The plan post-evaluation is to delete the losing version.

---

## 2. Commands

```bash
# Install (already done)
npm install

# Dev server (open http://localhost:4200/demo and scroll to "Cell flash on change")
npm start

# Build (production)
npm run build

# Run all tests (watch mode)
npm test

# Run only this feature's tests, headless, single-shot (use during development)
npx ng test \
  --include='src/app/components/cell-flash-on-change/**/*.spec.ts' \
  --no-watch \
  --browsers=ChromeHeadless
```

No lint script is wired up in `package.json` today — relying on Angular's TS compiler + the existing project conventions (verified against `app-dropdown-cva`).

---

## 3. Project structure

```
src/app/components/cell-flash-on-change/
├── cell-flash-on-change.types.ts                  # shared FlashableValue type + constants (FLASH_CLASS, DEFAULT_FLASH_DURATION_MS)
├── cell-flash-on-change-css.directive.ts          # Version A: setTimeout + CSS @keyframes
├── cell-flash-on-change-css.directive.spec.ts
├── cell-flash-on-change-waapi.directive.ts        # Version B: Element.animate() (Web Animations API)
├── cell-flash-on-change-waapi.directive.spec.ts
└── cell-flash-on-change.module.ts                 # declares + exports BOTH directives

src/styles/
└── _cell-flash-on-change.scss                     # Version A only — @keyframes + .cell-flash-on-change--flashing class
                                                    # imported once from src/styles.scss

src/app/demo/
├── demo-page.component.html                       # NEW section + TOC entry, renders BOTH versions side-by-side
├── demo-page.component.ts                         # NEW component state for the demo grid
└── demo-page.module.ts                            # imports CellFlashOnChangeModule

specs/cell-flash-on-change/
└── spec.md                                        # this document
```

**One module exports both directives** — consumers import `CellFlashOnChangeModule` and use whichever attribute they prefer. Once the team picks a winner, deleting the losing pair is purely additive removal: directive file, spec file, exported declaration, and (for Version A only) the SCSS file + `@use` import.

---

## 4. Demo page integration

**Location**: New section in `src/app/demo/demo-page.component.html`, sandwiched between the existing `data-test-id` section and the `engine-cmd` section.

**TOC entry**:
```html
<li><a href="#cell-flash">Cell flash on change directive (A vs. B)</a></li>
```

**What the demo shows** — one section, two side-by-side mock "live grids" (each 4 rows × 3 columns rendered as a `<table>`):

| Left grid | Right grid |
|---|---|
| `[appFlashOnChangeCss]` on each `<td>` | `[appFlashOnChangeWaapi]` on each `<td>` |

**Both grids render the same rows array** so a click that mutates the shared model causes both grids to react identically — the reviewer's eye does the side-by-side comparison.

**Buttons**:
- "**Mutate one cell**" — randomly picks a cell and changes its value (single flash, both grids).
- "**Mutate all cells**" — rewrites every cell to a new random value.
- "**Re-broadcast same values**" — re-assigns every cell to its **current** value (proves no flash in either grid).
- "**Reset table**" — restores initial values.

**Controls**:
- `flashDurationMs` numeric input (default 10000) — live-bound to both grids.

**Live state readout** below the tables (`<pre class="demo-section__state">`) showing the current rows model.

**Acceptance for the demo section**:
- Reviewer can click "Re-broadcast same values" any number of times → no flash in either grid. (Critical: this is the whole point.)
- Reviewer can click "Mutate one cell" → the same cell flashes amber in both grids.
- Reviewer can click "Mutate all cells" mid-fade → both grids cancel and restart cleanly.
- Lowering `flashDurationMs` to 1500 → next flash fades within 1.5 s in both grids.
- Both grids look and feel identical end-to-end. Differences (if any) are observable in DevTools (CSS class toggling vs. live `Animation` objects).

---

## 5. Public API (shared by both directives)

| Input | Type | Default | Notes |
|---|---|---|---|
| `appFlashOnChangeCss` / `appFlashOnChangeWaapi` (selector + value input) | `FlashableValue` | `null` | The watched primitive |
| `flashDurationMs` | `number` | `10_000` | Total fade-out duration in ms |

```typescript
// src/app/components/cell-flash-on-change/cell-flash-on-change.types.ts
export type FlashableValue = string | number | boolean | null;

export const FLASH_CLASS = 'cell-flash-on-change--flashing';
export const DEFAULT_FLASH_DURATION_MS = 10_000;

/**
 * Soft amber — universally read as "data changed" without being alarming.
 * Used by both directives so the visual is identical.
 */
export const FLASH_COLOR_RGBA = 'rgba(255, 213, 128, 0.85)';
```

Behavior shared by both:
- **Equality**: `Object.is(prev, next)` (handles `NaN`/`+0/-0` correctly; identical to `===` for normal primitives).
- **First emission**: suppressed (no flash).
- **Mid-flash retrigger**: cancels the in-flight flash and starts a new one cleanly.
- **Cleanup**: cancels any in-flight work in `ngOnDestroy`.

---

## 6. Implementation A — CSS keyframes + `setTimeout`

### Mechanism
- Directive adds a CSS class (`cell-flash-on-change--flashing`) via `Renderer2`. The class triggers a CSS `@keyframes` rule that fades `background-color` from soft amber → transparent over `animation-duration: var(--flash-duration, 10s)`.
- Directive sets `animation-duration` as an inline style equal to `flashDurationMs`.
- Directive schedules a single `setTimeout(removeClass, flashDurationMs)` to clean the class off after the fade completes.
- The `setTimeout` is wrapped in `NgZone.runOutsideAngular(...)` so it does NOT trigger change detection (critical for performance with 1 000 cells flashing per WebSocket tick).
- `prefers-reduced-motion: reduce` is handled in CSS via `@media`: animation is disabled, the class statically holds the amber color, and the directive's `setTimeout` snaps it back to transparent at the end of the duration.

### Code style (sketch)

```typescript
// cell-flash-on-change-css.directive.ts
import {
  Directive, ElementRef, Input, NgZone,
  OnChanges, OnDestroy, Renderer2, SimpleChanges,
} from '@angular/core';
import {
  DEFAULT_FLASH_DURATION_MS,
  FLASH_CLASS,
  FlashableValue,
} from './cell-flash-on-change.types';

@Directive({ selector: '[appFlashOnChangeCss]' })
export class CellFlashOnChangeCssDirective implements OnChanges, OnDestroy {
  @Input('appFlashOnChangeCss') value: FlashableValue = null;
  @Input() flashDurationMs: number = DEFAULT_FLASH_DURATION_MS;

  private hasSeenFirstValue = false;
  private removeClassTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly host: ElementRef<HTMLElement>,
    private readonly renderer: Renderer2,
    private readonly zone: NgZone,
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    const change = changes['value'];
    if (!change) return;
    if (!this.hasSeenFirstValue) { this.hasSeenFirstValue = true; return; }
    if (Object.is(change.previousValue, change.currentValue)) return;
    this.flash();
  }

  ngOnDestroy(): void { this.cancelPendingTimer(); }

  private flash(): void {
    const el = this.host.nativeElement;
    this.cancelPendingTimer();
    this.renderer.removeClass(el, FLASH_CLASS);                                  // restart animation cleanly
    this.renderer.setStyle(el, 'animation-duration', `${this.flashDurationMs}ms`);
    this.renderer.addClass(el, FLASH_CLASS);

    this.zone.runOutsideAngular(() => {                                          // perf: no CD storm with 1k cells
      this.removeClassTimer = setTimeout(() => {
        this.renderer.removeClass(el, FLASH_CLASS);
        this.removeClassTimer = null;
      }, this.flashDurationMs);
    });
  }

  private cancelPendingTimer(): void {
    if (this.removeClassTimer !== null) {
      clearTimeout(this.removeClassTimer);
      this.removeClassTimer = null;
    }
  }
}
```

```scss
// src/styles/_cell-flash-on-change.scss  (imported once from src/styles.scss)
@keyframes cell-flash-on-change-fade {
  0%   { background-color: rgba(255, 213, 128, 0.85); }
  100% { background-color: transparent; }
}

.cell-flash-on-change--flashing {
  animation-name: cell-flash-on-change-fade;
  animation-duration: 10s;             // overridden inline by the directive
  animation-timing-function: ease-out;
  animation-fill-mode: forwards;
}

@media (prefers-reduced-motion: reduce) {
  .cell-flash-on-change--flashing {
    animation: none;
    background-color: rgba(255, 213, 128, 0.6);   // static hold; directive removes class after duration
  }
}
```

### Pros
- Simplest code surface (~50 lines).
- Easy to test with `fakeAsync` + `tick()` — Angular-native testing pattern.
- Keyframes live in SCSS — themeable from the design system, not buried in TS.
- `prefers-reduced-motion` handled declaratively in CSS, not in JS.
- `runOutsideAngular` cleanly addresses the only real perf concern (zone-driven CD on timer fire).

### Cons
- Two sources of truth for the duration (the inline `animation-duration` style + the JS `setTimeout`). They must agree; bug surface area exists if anyone forgets to keep them in sync.
- `setTimeout` is an approximation of "when the animation ends" rather than a direct signal — for the animated case they're effectively identical, for reduced-motion the timer IS the duration.

---

## 7. Implementation B — Web Animations API (`Element.animate()`)

### Mechanism
- Directive calls `element.animate(keyframes, options)` to start a hardware-accelerated animation. The browser returns an `Animation` object with `.cancel()` / `.finish()` / `.finished` (Promise).
- The keyframes are declared inline in TS — same fade `rgba(255, 213, 128, 0.85)` → `transparent`.
- Directive keeps a single `Animation | null` ref. Each new flash calls `currentAnimation?.cancel()` then starts a new animation.
- No `setTimeout`. Cleanup on destroy = `currentAnimation?.cancel()`.
- `prefers-reduced-motion: reduce` is checked in JS via `matchMedia('(prefers-reduced-motion: reduce)').matches`. If true, the directive issues an animation whose **two keyframes are identical** (`FLASH_COLOR_RGBA` start AND end) with `easing: 'linear'`, producing a constant amber hold for the configured duration with no perceptible motion. Net effect mirrors Version A.
- `Element.animate` is **not patched by zone.js** — its callbacks (`finished` resolution, `oncancel`) don't trigger change detection. Already perf-safe for 1 000 cells with no extra ceremony.

### Code style (sketch)

```typescript
// cell-flash-on-change-waapi.directive.ts
import {
  Directive, ElementRef, Inject, Input,
  OnChanges, OnDestroy, SimpleChanges,
} from '@angular/core';
import { DOCUMENT } from '@angular/common';
import {
  DEFAULT_FLASH_DURATION_MS, FLASH_COLOR_RGBA, FlashableValue,
} from './cell-flash-on-change.types';

@Directive({ selector: '[appFlashOnChangeWaapi]' })
export class CellFlashOnChangeWaapiDirective implements OnChanges, OnDestroy {
  @Input('appFlashOnChangeWaapi') value: FlashableValue = null;
  @Input() flashDurationMs: number = DEFAULT_FLASH_DURATION_MS;

  private hasSeenFirstValue = false;
  private currentAnimation: Animation | null = null;
  private readonly view: Window;

  constructor(
    private readonly host: ElementRef<HTMLElement>,
    @Inject(DOCUMENT) doc: Document,
  ) {
    this.view = doc.defaultView!;
  }

  ngOnChanges(changes: SimpleChanges): void {
    const change = changes['value'];
    if (!change) return;
    if (!this.hasSeenFirstValue) { this.hasSeenFirstValue = true; return; }
    if (Object.is(change.previousValue, change.currentValue)) return;
    this.flash();
  }

  ngOnDestroy(): void { this.cancelCurrent(); }

  private flash(): void {
    this.cancelCurrent();

    // matchMedia is queried fresh per flash so the directive reacts to OS-level
    // toggles between flashes without holding a stale MediaQueryList ref.
    const reducedMotion = this.view.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const keyframes: Keyframe[] = reducedMotion
      ? [{ backgroundColor: FLASH_COLOR_RGBA }, { backgroundColor: FLASH_COLOR_RGBA }]   // static hold
      : [{ backgroundColor: FLASH_COLOR_RGBA }, { backgroundColor: 'transparent' }];

    const animation = this.host.nativeElement.animate(keyframes, {
      duration: this.flashDurationMs,
      easing: reducedMotion ? 'linear' : 'ease-out',
      // fill: 'none' so the cell returns to its natural CSS background after
      // the animation ends — no manual inline-style cleanup needed (Element.animate
      // doesn't write inline styles in the first place; it animates via the compositor).
      fill: 'none',
    });

    animation.onfinish = () => { this.currentAnimation = null; };
    this.currentAnimation = animation;
  }

  private cancelCurrent(): void {
    if (this.currentAnimation) {
      this.currentAnimation.cancel();
      this.currentAnimation = null;
      this.host.nativeElement.style.backgroundColor = '';
    }
  }
}
```

### Pros
- No `setTimeout`. Browser owns the timing end-to-end.
- Single source of truth for the duration (passed once to `Element.animate`).
- Native cancel semantics via `Animation.cancel()` — no manual timer bookkeeping.
- Not zone-patched → zero CD overhead, no need for `NgZone.runOutsideAngular`.
- `Animation.finished` is a Promise — if we ever want a `(flashed)` Output, it's trivially `await`-able.

### Cons
- Keyframes live in TS, not SCSS — slightly less themeable from the design system layer.
- `prefers-reduced-motion` checked in JS via `matchMedia` (more code than a CSS `@media` block; doesn't react if the user toggles the system setting between the directive's construction and the next flash, though `MediaQueryList.matches` is queried fresh on every flash so this is fine).
- Tests need to handle the WAAPI: `fixture.debugElement.nativeElement.getAnimations()` to query active animations, OR `spyOn(Element.prototype, 'animate').and.callThrough()` to assert keyframe contents.
- One direct `style.backgroundColor` write to clean up after `onfinish` — not strictly idiomatic Angular (could be wrapped in `Renderer2.removeStyle` to stay consistent with version A).

---

## 8. Code style — general rules followed by both directives

(Cross-checked against `.cursor/skills/angular-engineering/SKILL.md`.)

- `OnPush`-safe: neither directive calls `markForCheck` nor holds RxJS subscriptions.
- Public API typed (`FlashableValue` union, no `any`).
- Each directive ≤ 80 lines including comments — anything more = scope creep, push back.
- No `setInterval`, no `@angular/animations` triggers, no `::ng-deep`, no jQuery, no lodash.
- Version A uses `Renderer2` for every DOM mutation. Version B uses native WAAPI methods (which are not Renderer2-wrapped) plus one `nativeElement.style` reset; that one direct write is acceptable as `Renderer2` doesn't have a WAAPI surface.
- Single shared types/constants file (`cell-flash-on-change.types.ts`) — avoids drift between the two implementations.

---

## 9. Testing strategy

**Framework**: Jasmine + Karma (matches existing `app-dropdown-cva.directive.spec.ts`).
**Style**: DAMP, one behavior per `it`, observable outcomes only (never test internal state like `hasSeenFirstValue`).
**Location**: alongside each directive.

### Shared test cases (both spec files implement these)

```typescript
describe('Cell flash on change — <version>', () => {
  it('does NOT flash on the first value emission');
  it('flashes when the value changes');
  it('does NOT flash when the value is re-set to the same value');
  it('clears the highlight after flashDurationMs (default 10 000 ms)');
  it('clears the highlight after a custom flashDurationMs');
  it('cancels the in-flight flash and restarts cleanly when the value changes mid-flash');
  it('treats falsy primitives (0, false, "") as real values');
  it('treats NaN -> NaN as equal (Object.is) and does NOT flash');
  it('cancels in-flight work in ngOnDestroy and leaves no scheduled timers / running animations');
});
```

### Version A spec — observable outcomes
- Asserts presence/absence of the `cell-flash-on-change--flashing` class via `nativeElement.classList.contains(...)`.
- Asserts inline `animation-duration` style equals `${flashDurationMs}ms`.
- Uses `fakeAsync` + `tick(ms)` for all timer assertions.
- A small helper sets `(window as any).Zone` checks if needed to assert no extra zone tasks were scheduled (i.e., the timer ran outside Angular). Cheap version: assert `tick(durationMs)` does NOT cause `fixture.detectChanges()` to be needed for the cleanup to happen.

### Version B spec — observable outcomes
- Spies on `HTMLElement.prototype.animate` via `spyOn(host.nativeElement, 'animate').and.callThrough()` to assert the keyframe shape and options.
- Uses `host.nativeElement.getAnimations()` to assert that active animations exist after a flash and are cancelled after `ngOnDestroy`.
- Reduced-motion path tested by stubbing `matchMedia` in the test bed setup to return `{ matches: true }`.
- No `fakeAsync` / `tick()` for the animation duration itself — the `Animation` lifecycle is browser-native; tests assert the API was called correctly and the `Animation` was cancelled / finished, not "exactly Xms passed". This matches "test observable outcomes, not implementation timing".

### Test harness (shared)

```typescript
@Component({
  template: `
    <div [appFlashOnChangeCss]="value" [flashDurationMs]="duration"></div>
    <div [appFlashOnChangeWaapi]="value" [flashDurationMs]="duration"></div>
  `,
})
class HostComponent {
  value: FlashableValue = null;
  duration = 10_000;
}
```

Each version's spec file picks one of the two `<div>`s and exercises just its directive — keeps test failures locally scoped to the implementation under test.

---

## 10. Boundaries (Always / Ask first / Never)

### Always do
- Use `Object.is` for the equality check (handles `NaN`, identical to `===` for normal primitives).
- Suppress the flash on the first value emission.
- Cancel any in-flight work (timer or `Animation`) in `ngOnDestroy` AND on every new value change.
- Honor `prefers-reduced-motion: reduce`. (Version A: CSS media query. Version B: JS `matchMedia` check at flash time.)
- Type the public `@Input()` API explicitly using the `FlashableValue` union.
- Share constants and types via `cell-flash-on-change.types.ts` — both directives import from there. No copy-paste of `FLASH_COLOR_RGBA` or `DEFAULT_FLASH_DURATION_MS` between files.
- Write the test FIRST, see it fail, then implement (TDD; matches the project's `test-driven-development` skill).
- Keep each directive ≤ 80 lines including comments.

### Ask first
- Adding any HTTP, RxJS, or service dependency — both directives must remain pure DOM in v1.
- Adding `@Output()` events (`(flashed)`, `(flashStarted)` etc.) — plausible later, not in v1.
- Coupling the directives to a specific element type (e.g., only `<td>`) — v1 must work on any element.
- Bundling the SCSS keyframes anywhere other than `src/styles/_cell-flash-on-change.scss` + a `@use` from `src/styles.scss`.
- Supporting object/array values via a `flashComparator` input — confirmed out-of-scope (cells are primitives).
- Making the highlight color configurable via `@Input() flashColor`. Today's spec uses a fixed soft amber.
- Keeping BOTH versions in production after the evaluation. The plan is to delete one.

### Never do (both versions)
- Use `@angular/animations` triggers — heavier, runs on JS thread, requires the `BrowserAnimationsModule` contract.
- Direct string-injection like `nativeElement.style.animation = '...'`.
- Mutate the watched value or call `ChangeDetectorRef.markForCheck()` from inside the directive — that's the parent's job.
- Add jQuery, lodash, or any new npm dependency.
- Use `::ng-deep` (Version A: global SCSS file is the correct alternative).
- Skip cleanup in `ngOnDestroy` — leaked state across 1 000 cells = real bug.
- Test internal state (`hasSeenFirstValue`, `removeClassTimer`, `currentAnimation`) directly. Tests only assert observable DOM outcomes / WAAPI calls.

### Version A only
- **Always** wrap the `setTimeout` in `NgZone.runOutsideAngular` — without this, 1 000 cells flashing per tick causes 1 000 unnecessary CD cycles.
- **Never** use `setInterval` — only one `setTimeout` per active flash.

### Version B only
- **Always** call `currentAnimation.cancel()` before starting a new one — otherwise stacked animations on the same element produce undefined visual results.
- **Never** rely on `Animation.finished` (Promise) for cleanup — `onfinish` callback is more deterministic and avoids zone-microtask ambiguity.

---

## 11. Open questions & next steps

### Open questions
None blocking. Two minor placement decisions deferred to `/implement`:
- Whether `src/styles/_cell-flash-on-change.scss` should live in a new `src/styles/` subfolder (preferred) or be inlined in `src/styles.scss` directly (uglier but one fewer file).
- Whether to also add a subtle `box-shadow: inset 0 0 0 1px rgba(...)` for low-vision a11y on top of the background change.

### Evaluation rubric (post-implementation, before deletion)
When deciding which version stays, evaluate against:
1. **Code clarity** — which one a new engineer can read end-to-end in <2 min and explain.
2. **Test ergonomics** — which spec is easier to extend (TDD-friendly).
3. **Behavior parity** — confirm side-by-side they look pixel-identical in the demo.
4. **DevTools experience** — Version A's class toggling is grep-able in the DOM; Version B's `getAnimations()` is queryable in the console. Pick whichever the team finds more debuggable.
5. **Theme integration** — if the design system needs to override the flash color across multiple consumers, the SCSS approach (Version A) wins. If the directive will live in isolation, WAAPI is fine.

### Next step
Run `/plan` (or just say "go ahead, implement it") to produce the implementation plan + tasks for **both** directives, then `/implement`. Each directive is small; the plan/tasks for both can be a single short checklist.

---

## Cross-references

- Mirrors the patterns documented in `.cursor/skills/angular-engineering/SKILL.md` (OnPush-safe, `Renderer2`, no `::ng-deep`, no leaked timers).
- Follows the same file-layout convention as `src/app/components/app-dropdown-cva/`.
- Test approach follows `.cursor/skills/test-driven-development/SKILL.md` (RED → GREEN → REFACTOR, DAMP, observable outcomes).
- Demo integration follows the section + TOC pattern already established in `src/app/demo/demo-page.component.html`.
- `Element.animate()` browser support verified against `.browserslistrc` — universal across the project's targeted browsers.
