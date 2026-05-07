# Implementation Tasks: Cell Flash on Change

**Task ID:** `cell-flash-on-change`
**Created:** 2026-05-07
**Status:** Ready for Implementation
**Based on:** `plan.md` (which derives from `spec.md`)

---

## Summary

| Metric | Value |
|---|---|
| Total Tasks | 5 |
| Estimated Effort | ~8.5 h (one developer, sequential) |
| Phases | 5 |
| Critical Path | T1.1 → T2.1 → T3.1 → T4.1 → T5.1 |
| Parallelizable | T2.1 ‖ T3.1 (saves ~2.5 h with two developers → ~6 h total) |

---

## Phase 1: Foundation

**Goal:** Land the scaffolding all subsequent tasks depend on — shared types, empty module, SCSS file, global import. Nothing user-visible yet, but every other task imports from here.
**Estimated:** ~1 h

### Task 1.1: Create shared scaffolding (types, module, SCSS, global import)

**Description:**
Create the four foundation files and wire the SCSS into the global stylesheet. The module is initially empty (no declarations) — Tasks 2.1 and 3.1 will add directive declarations as each version lands.

**Files created:**
- `src/app/components/cell-flash-on-change/cell-flash-on-change.types.ts`
- `src/app/components/cell-flash-on-change/cell-flash-on-change.module.ts`
- `src/styles/_cell-flash-on-change.scss`

**Files modified:**
- `src/styles.scss` (one-line `@use` or `@import`, matching existing convention — confirm by reading the file first)

**Acceptance Criteria:**
- [ ] `cell-flash-on-change.types.ts` exports: `FlashableValue` type (`string | number | boolean | null`), `FLASH_CLASS` constant (`'cell-flash-on-change--flashing'`), `FLASH_COLOR_RGBA` constant (`'rgba(255, 213, 128, 0.85)'`), `DEFAULT_FLASH_DURATION_MS` constant (`10_000`).
- [ ] `cell-flash-on-change.module.ts` defines an empty `@NgModule` (no declarations / providers / exports yet) — the file compiles and is importable.
- [ ] `_cell-flash-on-change.scss` contains:
  - `@keyframes cell-flash-on-change-fade` with `0% { background-color: rgba(255, 213, 128, 0.85); }` → `100% { background-color: transparent; }`
  - `.cell-flash-on-change--flashing` rule with `animation-name`, `animation-duration: 10s` (overridden inline by directive), `animation-timing-function: ease-out`, `animation-fill-mode: forwards`
  - `@media (prefers-reduced-motion: reduce)` block setting `animation: none` and a static `background-color: rgba(255, 213, 128, 0.6)`
- [ ] `src/styles.scss` imports the new SCSS file once. **Read `src/styles.scss` before editing** — if it uses `@use`, follow that; if `@import`, follow that.
- [ ] `npm run build` succeeds with no warnings.
- [ ] `npm test` (full suite) passes with no new tests added — verifies no regressions.

**Effort:** 1 h (XS)
**Priority:** High
**Dependencies:** None
**Assignee:** Unassigned

**Risk notes:**
- R6 from plan: confirm SCSS import convention before writing the line.

---

## Phase 2: Version A — CSS keyframes + setTimeout

**Goal:** Ship Version A (`[appFlashOnChangeCss]`) using TDD against the 10 test cases in `spec.md` §9. By the end of this phase, Version A is fully functional, fully tested, and importable from `CellFlashOnChangeModule`.
**Estimated:** ~2.5 h

### Task 2.1: Implement CellFlashOnChangeCssDirective via TDD

**Description:**
Implement Version A test-first. For each of the 10 test cases listed in `spec.md` §9, write the failing test (RED), implement the minimum code in the directive to make it pass (GREEN), then refactor (keep all tests green). Once all 10 tests pass, declare the directive in `CellFlashOnChangeModule` and add it to module exports.

**TDD order (recommended):**
1. "does NOT flash on the first value emission"
2. "flashes when the value changes"
3. "does NOT flash when the value is re-set to the same value"
4. "clears the highlight after flashDurationMs (default 10 000 ms)"
5. "clears the highlight after a custom flashDurationMs"
6. "writes animation-duration inline style equal to flashDurationMs"
7. "cancels the in-flight flash and restarts cleanly when the value changes mid-flash"
8. "treats falsy primitives (0, false, '') as real values"
9. "treats NaN -> NaN as equal (Object.is) and does NOT flash"
10. "cancels in-flight work in ngOnDestroy and leaves no scheduled timers"

**Files created:**
- `src/app/components/cell-flash-on-change/cell-flash-on-change-css.directive.ts`
- `src/app/components/cell-flash-on-change/cell-flash-on-change-css.directive.spec.ts`

**Files modified:**
- `src/app/components/cell-flash-on-change/cell-flash-on-change.module.ts` (add to declarations + exports)

**Acceptance Criteria:**
- [ ] `CellFlashOnChangeCssDirective` declared with selector `[appFlashOnChangeCss]`.
- [ ] Public API matches spec §5: input `appFlashOnChangeCss: FlashableValue`, input `flashDurationMs: number = DEFAULT_FLASH_DURATION_MS`.
- [ ] Uses `Renderer2` for ALL DOM mutation — no direct `nativeElement.classList.*` or `nativeElement.style.*`.
- [ ] `setTimeout` is wrapped in `NgZone.runOutsideAngular(() => ...)` (load-bearing for ADR-5; verifiable by grep).
- [ ] Mid-flash restart removes the class, forces a reflow (`void el.offsetWidth;` with a `// load-bearing: forces reflow so the @keyframes restarts cleanly` comment), then re-adds the class (R1 mitigation).
- [ ] `ngOnDestroy` clears any pending timer.
- [ ] All 10 tests pass via `npx ng test --include='src/app/components/cell-flash-on-change/cell-flash-on-change-css.directive.spec.ts' --no-watch --browsers=ChromeHeadless`.
- [ ] Tests use `fakeAsync` + `tick(ms)` for all timer assertions — no real waits.
- [ ] Tests assert observable outcomes only (DOM class presence, inline style value) — never internal state (`hasSeenFirstValue`, `removeClassTimer`).
- [ ] Directive file is ≤80 lines including comments (per spec boundary).
- [ ] Module declares + exports the directive; `CellFlashOnChangeModule` compiles.
- [ ] `npm test` (full suite) passes — no regressions to existing tests.

**Effort:** 2.5 h (S)
**Priority:** High
**Dependencies:** Task 1.1
**Assignee:** Unassigned

**Risk notes:**
- R1: animation restart trick — apply force-reflow workaround proactively; don't wait for the flake.

---

## Phase 3: Version B — Web Animations API

**Goal:** Ship Version B (`[appFlashOnChangeWaapi]`) using TDD against the same 10 test cases (adapted to WAAPI assertions). By the end of this phase, both versions are functional and importable from the same module.
**Estimated:** ~2.5 h

### Task 3.1: Implement CellFlashOnChangeWaapiDirective via TDD

**Description:**
Implement Version B test-first. Same 10 behaviors as Task 2.1, but the test assertions use WAAPI-native queries (`spyOn(Element.prototype, 'animate').and.callThrough()` to assert keyframe shape; `host.nativeElement.getAnimations()` to assert active animations). The reduced-motion test path stubs `window.matchMedia` to return `{ matches: true }`. No `fakeAsync` for the animation duration itself — assert that `animate()` was called with `{ duration: flashDurationMs, ... }` and that the returned `Animation` is cancelled on destroy / mid-flash retrigger.

**Test harness pattern (document at top of spec file as a one-time comment block — R2 mitigation):**
```typescript
// WAAPI testing pattern:
// 1. Spy on Element.prototype.animate to capture/inspect calls.
// 2. Use host.nativeElement.getAnimations() to query active animations.
// 3. Stub window.matchMedia in beforeEach to control prefers-reduced-motion path.
// 4. Use Animation.cancel()/finish() to drive lifecycle in tests, not fakeAsync.
```

**TDD order:** Same 10 cases as Task 2.1, in the same order.

**Files created:**
- `src/app/components/cell-flash-on-change/cell-flash-on-change-waapi.directive.ts`
- `src/app/components/cell-flash-on-change/cell-flash-on-change-waapi.directive.spec.ts`

**Files modified:**
- `src/app/components/cell-flash-on-change/cell-flash-on-change.module.ts` (add to declarations + exports alongside Version A)

**Acceptance Criteria:**
- [ ] `CellFlashOnChangeWaapiDirective` declared with selector `[appFlashOnChangeWaapi]`.
- [ ] Public API matches spec §5: input `appFlashOnChangeWaapi: FlashableValue`, input `flashDurationMs: number = DEFAULT_FLASH_DURATION_MS`.
- [ ] Uses `Element.animate()` for the animation — **no `setTimeout` anywhere** (verifiable by grep).
- [ ] Uses `window.matchMedia('(prefers-reduced-motion: reduce)')` checked **fresh on each flash** (not cached at construction — user can toggle the OS setting at runtime).
- [ ] Reduced-motion path uses a static-color keyframes pair `[{ backgroundColor: FLASH_COLOR_RGBA }, { backgroundColor: FLASH_COLOR_RGBA }]` instead of fading.
- [ ] Cancels the in-flight `Animation` (via `currentAnimation.cancel()`) before starting a new one and in `ngOnDestroy`.
- [ ] `Animation.onfinish` callback resets `nativeElement.style.backgroundColor = ''` to clear the inline style.
- [ ] All 10 tests pass via `npx ng test --include='src/app/components/cell-flash-on-change/cell-flash-on-change-waapi.directive.spec.ts' --no-watch --browsers=ChromeHeadless`.
- [ ] Tests stub `matchMedia` for reduced-motion assertions.
- [ ] Tests assert observable outcomes only (animation calls, returned `Animation` state) — never internal state.
- [ ] Directive file is ≤80 lines including comments (per spec boundary).
- [ ] WAAPI testing pattern documented at the top of the spec file.
- [ ] `npm test` (full suite) passes — no regressions.

**Effort:** 2.5 h (S)
**Priority:** High
**Dependencies:** Task 1.1 (parallel-safe with Task 2.1)
**Assignee:** Unassigned

**Risk notes:**
- R2: WAAPI test ergonomics — apply the documented pattern from the start, don't reinvent per-test.
- R3: `matchMedia` stubbing — use the verified pattern in plan §8.

---

## Phase 4: Demo page integration

**Goal:** Make both directives interactively reviewable on `/demo`. After this task, a reviewer can open the demo page, click buttons, see both grids respond identically, and verify the "re-broadcast same values does NOT flash" behavior with their own eyes.
**Estimated:** ~1.5 h

### Task 4.1: Add "Cell flash on change" section to the demo page

**Description:**
Add a new section to `src/app/demo/demo-page.component.html` between the existing `data-test-id` section and the `engine-cmd` section. The section renders two side-by-side `<table>` elements (4 rows × 3 columns each) — left wired to `[appFlashOnChangeCss]`, right to `[appFlashOnChangeWaapi]`. Both tables read from the same `rows` array on the component, so a single mutation drives both grids.

Add 5 buttons: Mutate one cell · Mutate all cells · Re-broadcast same values · Reset · **Spawn 1000 cells** (stress test). Add a numeric input for `flashDurationMs`. Add a TOC entry for the new section. Import `CellFlashOnChangeModule` in `demo-page.module.ts`.

**Files modified:**
- `src/app/demo/demo-page.component.ts` (add `flashRows`, `flashDuration`, 5 button handler methods)
- `src/app/demo/demo-page.component.html` (TOC entry + new `<section id="cell-flash">`)
- `src/app/demo/demo-page.module.ts` (import `CellFlashOnChangeModule`)

**Acceptance Criteria:**
- [ ] TOC entry added: `<li><a href="#cell-flash">Cell flash on change directive (A vs. B)</a></li>` (in the existing `<nav class="demo-page__toc">` block).
- [ ] New `<section class="demo-section" id="cell-flash">` renders:
  - `<h2>Cell flash on change directive — Version A vs. Version B</h2>`
  - `<p class="demo-section__desc">` describing the comparison and that both tables share the same data.
  - Two side-by-side `<table>`s wrapped in a flex container; each cell is a `<td [appFlashOnChangeCss]="row.values[colKey]" [flashDurationMs]="flashDuration">` (left) or `[appFlashOnChangeWaapi]` (right).
  - 5 buttons in a `<div class="demo-section__actions">`: "Mutate one cell", "Mutate all cells", "Re-broadcast same values", "Reset table", "Spawn 1000 cells".
  - Numeric input bound to `flashDuration` with `min="100"`, default `10000`, label "Flash duration (ms)".
  - `<pre class="demo-section__state">` showing `rows: {{ flashRows | json }}` (truncated to first 4 rows in the readout to avoid bloating the page on the 1k stress test).
- [ ] Component methods exist: `mutateOneCell()`, `mutateAllCells()`, `rebroadcastSameValues()`, `resetFlashTable()`, `spawnThousandCells()`.
- [ ] `rebroadcastSameValues()` re-assigns each cell to its current value (proves no flash via `Object.is`).
- [ ] `mutateAllCells()` rewrites every cell to a new random value.
- [ ] `spawnThousandCells()` re-builds `flashRows` to ~1000 cells (e.g., 100 rows × 10 columns) so the perf claim is testable.
- [ ] `*ngFor` directives in the new section use `trackBy` on row id and column id (per `angular-engineering` skill).
- [ ] `CellFlashOnChangeModule` imported in `demo-page.module.ts`.
- [ ] Manual checks (open `http://localhost:4200/demo` after `npm start`):
  - Click "Re-broadcast same values" → no flash in either grid.
  - Click "Mutate one cell" → the same cell flashes amber in both grids.
  - Click "Mutate all cells" while a flash is in progress → all flashes restart cleanly, no visual artifacts.
  - Lower duration to 1500 → next flash fades within 1.5 s in both grids.
- [ ] `npm run build` succeeds with no warnings.

**Effort:** 1.5 h (XS)
**Priority:** High
**Dependencies:** Task 2.1 AND Task 3.1 (needs both directives declared)
**Assignee:** Unassigned

**Risk notes:**
- R7: keep section markup compact (target ≤80 lines of HTML) — link from TOC instead of repeating context.

---

## Phase 5: Verification

**Goal:** Confirm all acceptance criteria from spec.md §1 are met via the full test suite, a production build, manual smoke testing on the demo, and an eyeball-level perf check via the 1000-cell stress button. Sync the spec with any discoveries.
**Estimated:** ~1 h

### Task 5.1: Verification & spec sync

**Description:**
Run the full automated suite and production build. Manually exercise every demo button. Run the 1000-cell stress test with Chrome DevTools Performance tab recording open. Manually verify the reduced-motion path. Update `spec.md` with any discoveries (placement decisions, surprises, defects-found-during-test).

**Acceptance Criteria:**
- [ ] `npm test` passes the FULL suite headlessly: `ng test --no-watch --browsers=ChromeHeadless`.
- [ ] `npm run build` succeeds with no warnings.
- [ ] No `console.error` or `console.warn` during tests.
- [ ] Manual demo smoke (open `/demo`, "Cell flash on change" section):
  - All 5 buttons behave per Task 4.1's manual-check list.
  - Numeric `flashDurationMs` input live-affects the next flash.
  - Both tables look pixel-identical at default duration.
- [ ] **1000-cell stress test:**
  - Click "Spawn 1000 cells" → table re-renders.
  - Click "Mutate all cells" with Chrome DevTools Performance tab recording.
  - Verify no main-thread long task > 50 ms during the flash storm (eyeball the recording).
  - Page remains interactive (can scroll, can click another button mid-flash).
  - Note observation in PR description (DevTools screenshot welcome but not required).
- [ ] **Reduced-motion check:**
  - Chrome DevTools → Rendering → "Emulate CSS prefers-reduced-motion: reduce".
  - Click "Mutate one cell" → both grids show a static colored hold for the configured duration, then snap back to transparent (no fade animation).
- [ ] **Color-contrast spot check:** open the demo, eyeball the amber flash on the white default background AND on the dark `--system-experiments` section background — both legible.
- [ ] `spec.md` updated if any of:
  - SCSS placement decision was made differently than planned.
  - The optional inset box-shadow for low-vision was added (or explicitly rejected).
  - A test case revealed a behavior worth documenting.
  - A defect was found and fixed.
- [ ] PR description includes:
  - Link to spec.md, plan.md, tasks.md.
  - Brief eval rubric scorecard (5 criteria from spec §11) so reviewers can start the evaluation immediately.

**Effort:** 1 h (XS)
**Priority:** High
**Dependencies:** Task 4.1
**Assignee:** Unassigned

**Risk notes:**
- R4: 1000-cell perf claim is eyeball-only at this stage. If it doesn't hit target, file a follow-up and document the observation in the PR — don't silently fix or silently ship.

---

## Dependency Graph

```
Phase 1                  Phase 2 (Version A)
┌─────────────┐         ┌──────────────────┐
│  Task 1.1   │────────▶│  Task 2.1        │──┐
│  Foundation │         │  CSS directive   │  │
└─────────────┘         │  (TDD, 10 tests) │  │
                        └──────────────────┘  │
       │                                      │       Phase 4               Phase 5
       │                Phase 3 (Version B)   │     ┌──────────┐         ┌──────────┐
       │                ┌──────────────────┐  │     │ Task 4.1 │         │ Task 5.1 │
       └───────────────▶│  Task 3.1        │──┴────▶│ Demo page │────────▶│ Verify   │
                        │  WAAPI directive │        │ (both)    │         │ + spec   │
                        │  (TDD, 10 tests) │        └──────────┘         │  sync    │
                        └──────────────────┘                              └──────────┘

Critical path (sequential):    1.1 → 2.1 → 3.1 → 4.1 → 5.1   (~8.5 h)
Parallel (two developers):     1.1 → (2.1 ‖ 3.1) → 4.1 → 5.1 (~6 h)
```

---

## Quick Reference Checklist

### Phase 1: Foundation
- [ ] Task 1.1: Create shared scaffolding (types, module, SCSS, global import)

### Phase 2: Version A
- [ ] Task 2.1: Implement CellFlashOnChangeCssDirective via TDD

### Phase 3: Version B
- [ ] Task 3.1: Implement CellFlashOnChangeWaapiDirective via TDD

### Phase 4: Demo
- [ ] Task 4.1: Add "Cell flash on change" section to the demo page

### Phase 5: Verification
- [ ] Task 5.1: Verification & spec sync

---

## Risk Areas

| Task | Risk | Mitigation |
|---|---|---|
| Task 1.1 | SCSS import convention (`@use` vs `@import`) differs from plan assumption | Read `src/styles.scss` first, follow whatever pattern is already there |
| Task 2.1 | CSS animation restart needs a force-reflow trick to work in same change-detection tick | Apply `void el.offsetWidth;` proactively between class remove + add, with comment explaining why |
| Task 2.1 | Forgot to wrap `setTimeout` in `runOutsideAngular` | Acceptance criterion explicitly checks for it; PR review checklist includes it |
| Task 3.1 | `spyOn(Element.prototype, 'animate')` is non-standard for this repo | Document the WAAPI testing pattern at the top of the spec file as a one-time comment block |
| Task 3.1 | `window.matchMedia` may need stubbing in headless Chrome | Use the documented stub in plan.md §8 (R3) |
| Task 4.1 | Demo page already long (312 lines); risk of bloat | Cap new section at ≤80 lines of HTML; link from TOC for context |
| Task 5.1 | "60 fps with 1000 cells" is unmeasured at design time | Eyeball-test acceptable; if it fails, file follow-up and document in PR — do NOT silently fix or silently ship |

---

## Sizing recap

| Size | Hours | Tasks at this size |
|---|---|---|
| XS | 1–2 h | T1.1, T4.1, T5.1 |
| S | 2–4 h | T2.1, T3.1 |
| M | 4–8 h | (none) |
| L | 8–16 h | (none) |

No task exceeds 4 h. Each task is independently testable and has clear acceptance criteria.

---

## Next Steps

1. Review this task list (with `plan.md` + `spec.md` for context).
2. Optionally assign tasks to developers (T2.1 and T3.1 can run in parallel after T1.1 lands).
3. Run `/implement cell-flash-on-change` to start execution — TDD per the project's `test-driven-development` skill, beginning with Task 1.1.

---

*Tasks created with SDD 2.0; aligned with `.cursor/skills/{angular-engineering, test-driven-development, performance-optimization, code-simplification}/SKILL.md`.*
