# Technical Plan: Cell Flash on Change

**Task ID:** `cell-flash-on-change`
**Created:** 2026-05-07
**Status:** Ready for Implementation
**Based on:** `specs/cell-flash-on-change/spec.md` (two-version variant)

> This plan deliberately defers details that are already locked in the spec (public API, success criteria, code sketches, boundaries). Read it alongside `spec.md` — this document captures the **why** (ADRs), **how** (phases, risks), and **integration points** that the spec doesn't.

---

## 1. System Architecture

### Where the directive sits

```
┌──────────────────────────────────────────────────────────────────┐
│  Real page (e.g. system-experiments board grid)                   │
│  ┌───────────────────────────────────────────────────────────┐    │
│  │  <td [appFlashOnChangeCss]="row.values[col]">             │    │
│  │    {{ row.values[col] }}                                  │    │
│  │  </td>                                                    │    │
│  └────────────────────────────┬──────────────────────────────┘    │
│                               │                                   │
│  ┌────────────────────────────▼──────────────────────────────┐    │
│  │  WebSocket → service → BehaviorSubject<Row[]> → async pipe │    │
│  │  Every tick re-emits ALL rows (changed + unchanged)        │    │
│  └────────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│  CellFlashOnChangeModule  (this feature)                          │
│  ┌──────────────────────────┐    ┌──────────────────────────┐     │
│  │ CellFlashOnChangeCss     │    │ CellFlashOnChangeWaapi   │     │
│  │ Directive                │    │ Directive                │     │
│  │ • Renderer2 class toggle │    │ • Element.animate()      │     │
│  │ • setTimeout (zone-out)  │    │ • Animation.cancel()     │     │
│  └──────────────┬───────────┘    └──────────┬───────────────┘     │
│                 │                           │                     │
│                 └────────────┬──────────────┘                     │
│                              ▼                                    │
│                  cell-flash-on-change.types.ts                    │
│                  • FlashableValue, FLASH_CLASS,                   │
│                    FLASH_COLOR_RGBA, DEFAULT_FLASH_DURATION_MS    │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│  src/styles.scss                                                  │
│   └── @use 'styles/cell-flash-on-change';   (Version A only)      │
│       • @keyframes cell-flash-on-change-fade                      │
│       • .cell-flash-on-change--flashing                           │
│       • @media (prefers-reduced-motion: reduce) override          │
└──────────────────────────────────────────────────────────────────┘
```

### Integration points
- **Demo page (`/demo`)** — first consumer; renders BOTH directives side-by-side on the same data model so a single mutation drives both grids.
- **Future host page** — `system-experiments` board grids will adopt the winning directive after evaluation. Out of scope for this PR.
- **No service, no router, no store** — pure DOM directives.

---

## 2. Technology Stack

| Layer | Choice | Version | Rationale |
|---|---|---|---|
| Framework | Angular | 13.3 (existing) | Project version, no upgrade needed |
| Reactive primitives | RxJS | 7.5 (existing) | Not used inside the directives — both are `OnChanges`/`OnDestroy`-only |
| DOM (Version A) | `Renderer2` | built-in | Project convention; abstracts host element access |
| DOM (Version B) | `Element.animate` (Web Animations API) | platform-native | Not zone-patched; cancellable handle; supported in browserslist targets |
| Reduced motion (V-A) | CSS `@media (prefers-reduced-motion: reduce)` | platform-native | Declarative; no JS branching |
| Reduced motion (V-B) | `MediaQueryList` via `Window.matchMedia` | platform-native | Required because keyframes live in JS for V-B |
| Tests | Jasmine + Karma + Chrome Headless | 4.0 / 6.3 (existing) | Project convention |

### Dependencies
**No new dependencies.** Both implementations use platform APIs already available in Angular 13 + the project's browserslist targets.

---

## 3. File-by-File Design

| File | Status | LOC budget | Purpose |
|---|---|---|---|
| `src/app/components/cell-flash-on-change/cell-flash-on-change.types.ts` | NEW | ≤30 | Shared `FlashableValue` union + 3 constants. Single source of truth for both directives. |
| `src/app/components/cell-flash-on-change/cell-flash-on-change-css.directive.ts` | NEW | ≤80 | Version A — class toggle + `setTimeout` in `runOutsideAngular` |
| `src/app/components/cell-flash-on-change/cell-flash-on-change-css.directive.spec.ts` | NEW | ≤200 | 10 unit tests, `fakeAsync` + `tick`, observable outcomes only |
| `src/app/components/cell-flash-on-change/cell-flash-on-change-waapi.directive.ts` | NEW | ≤80 | Version B — `Element.animate()` + `Animation.cancel()` |
| `src/app/components/cell-flash-on-change/cell-flash-on-change-waapi.directive.spec.ts` | NEW | ≤200 | 10 unit tests, `spyOn(el, 'animate')`, stubbed `matchMedia` |
| `src/app/components/cell-flash-on-change/cell-flash-on-change.module.ts` | NEW | ≤20 | NgModule declares + exports both directives |
| `src/styles/_cell-flash-on-change.scss` | NEW | ≤30 | `@keyframes`, `.cell-flash-on-change--flashing` class, reduced-motion `@media` |
| `src/styles.scss` | MODIFIED (+1 line) | — | One `@use` import for the new SCSS file |
| `src/app/demo/demo-page.component.ts` | MODIFIED (+~40 lines) | — | State for the demo grid + 5 buttons handlers |
| `src/app/demo/demo-page.component.html` | MODIFIED (+~80 lines) | — | New section with two side-by-side tables + TOC entry |
| `src/app/demo/demo-page.module.ts` | MODIFIED (+1 import) | — | Import `CellFlashOnChangeModule` |
| `specs/cell-flash-on-change/plan.md` | NEW | — | This document |
| `specs/cell-flash-on-change/tasks.md` | NEW | — | Task breakdown (next step) |

**Total new code budget**: directives + types ≤210 lines; tests ≤400 lines; SCSS ≤30 lines; demo additions ~120 lines. Well within the project's "components ≤200 lines" guideline (each directive sits at ≤80).

---

## 4. Public API Contract

(Reference only — full text in `spec.md` §5.)

### Behavior matrix (the test cases live in §9 of spec.md, this is the lookup)

| `previousValue` → `currentValue` | Flashes? | Reason |
|---|---|---|
| `undefined` → `"hello"` (first emission) | NO | First-emission suppression |
| `"hello"` → `"hello"` | NO | `Object.is` match |
| `"hello"` → `"world"` | YES | Value changed |
| `0` → `0` | NO | `Object.is(0, 0) === true` |
| `0` → `1` | YES | Value changed |
| `false` → `false` | NO | `Object.is(false, false) === true` |
| `""` → `""` | NO | `Object.is("", "") === true` |
| `null` → `"x"` (after first emission) | YES | Value changed (null is a real value) |
| `NaN` → `NaN` | NO | `Object.is(NaN, NaN) === true` (the reason for `Object.is` over `===`) |
| value changes mid-flash | YES (restarts) | Cancel in-flight, start new |

---

## 5. Performance Strategy

### Targets (acceptance, not aspirational)
- **60 fps** during 1000 simultaneous flashes on the demo's "Spawn 1000 cells" stress button.
- **Zero `markForCheck` calls** from inside either directive (verified by code review).
- **No long tasks (>50 ms)** on the main thread during a flash storm (verified by Chrome DevTools Performance tab record).
- **Animation runs on the compositor** — visible in Chrome DevTools "Layers" panel.

### How each version achieves it

**Version A (CSS + setTimeout)**
- `background-color` is one of the [compositor-promoted properties](https://web.dev/animations-guide/) → animation runs off the main thread.
- The single `setTimeout` per active flash is wrapped in `NgZone.runOutsideAngular(...)` — its callback does NOT trigger change detection. With 1 000 cells flashing simultaneously, that's the difference between 0 and 1 000 unnecessary CD ticks per fade cycle.
- DOM mutation is one `Renderer2.removeClass` per cleanup — cheap.

**Version B (WAAPI)**
- `Element.animate()` runs on the compositor, same as CSS keyframes.
- `Element.animate` is **not patched by zone.js** — `Animation.onfinish` callbacks fire outside the Angular zone by default. No `runOutsideAngular` ceremony needed.
- `Animation.cancel()` is O(1).

### Measurement plan
- **Demo page** includes a "Spawn 1000 cells" button. Click → table re-renders with 1000 random-value cells, then "Mutate all cells" makes them all flash.
- During implementation: open Chrome DevTools → Performance → record while clicking "Mutate all cells" with 1000 cells. Verify no main-thread long tasks > 50 ms.
- Document the observation in the PR description (eyeball + DevTools screenshot, not a hard CI metric — adding a perf-CI gate is out of scope).

---

## 6. Accessibility & RTL

### `prefers-reduced-motion: reduce`
Already in spec §6/§7. Both versions honor it. Manual verification: enable via OS setting or Chrome DevTools → Rendering → "Emulate CSS prefers-reduced-motion: reduce" → flash a cell → must see static colored hold instead of fade.

### Color contrast
Soft amber `rgba(255, 213, 128, 0.85)` over white = ~3:1 contrast (background, not text). Acceptable as a non-text indicator per WCAG 2.1 SC 1.4.11. Over the dark `#0d1626` grid background used by `system-experiments` previews, the amber overlay is even more legible.
- **Verification**: visually confirm in the demo on both light (default) and dark (`--system-experiments`) section backgrounds.

### Keyboard / screen reader
**Intentionally none.** The directive provides a purely visual cue. Adding `aria-live="polite"` would make screen readers announce every cell change — for a 1000-cell websocket grid, that's a constant unintelligible noise. If/when accessibility for non-sighted users becomes a requirement, the right answer is a separate "Recently changed" panel summarizing the last N changes, NOT this directive announcing everything.

### RTL safety
The directive only mutates `background-color` (Version A via class, Version B via inline style during the animation lifecycle). `background-color` has no directional component — there are no `left`/`right`, no `padding`, no `border`, no `text-align`, no `inset-inline-*` involved. **The directive is RTL-clean by construction.** Confirmed against the project's `rtl-bidi-ui` skill: nothing in either implementation triggers physical-vs-logical-property concerns.

---

## 7. Implementation Phases

| # | Phase | Output | Approx. effort |
|---|---|---|---|
| 1 | Foundation | types file, empty module, SCSS file, `@use` import | ~1 h |
| 2 | Version A via TDD | 10 RED → GREEN → REFACTOR cycles → directive declared in module | ~2.5 h |
| 3 | Version B via TDD | 10 RED → GREEN → REFACTOR cycles → directive declared in module | ~2.5 h |
| 4 | Demo page | state model, two `<table>`s, 5 buttons, TOC entry | ~1.5 h |
| 5 | Verification | full test suite, prod build, manual smoke, 1000-cell stress, reduced-motion check | ~1 h |
| **Total** | | | **~8.5 h** |
| 6 | (post-merge) Evaluation & winner selection | one version deleted | ~1 sprint of real-world use |

**Critical path** (sequential, one developer): 1 → 2 → 3 → 4 → 5 = ~8.5 h.
**Parallelizable** (two developers): 1 → (2 ‖ 3) → 4 → 5 = ~6 h.

---

## 8. Risk Assessment

| # | Risk | Impact | Likelihood | Mitigation |
|---|---|---|---|---|
| R1 | Version A's "remove class then add class" trick doesn't restart the CSS animation in the same change-detection tick (browser batching) | Medium | Medium | Force a reflow between remove and add: `void el.offsetWidth;`. Document in code as a load-bearing line, not a stray expression. |
| R2 | WAAPI test ergonomics — `spyOn(Element.prototype, 'animate')` is non-standard for this repo (no precedent in `app-dropdown-cva.directive.spec.ts`) | Medium | High | Document the test pattern at the top of the WAAPI spec file as a one-time "WAAPI testing harness" comment block. Future contributors see the pattern in context. |
| R3 | `matchMedia` is `undefined` or non-stubbable in some headless Chrome configs | Low | Low | Use `spyOn(window, 'matchMedia').and.returnValue({ matches: true, addEventListener: () => {}, ... } as MediaQueryList)`. Verified in Karma + headless Chrome. |
| R4 | "60 fps with 1 000 cells" is unmeasured at design time | Medium | Medium | Demo "Spawn 1000 cells" button + Performance tab recording is part of Phase 5 acceptance. If it doesn't hit target, file a follow-up — don't gate the merge. |
| R5 | Team picks neither version after evaluation, asks for v3 | Low | Low | Both versions stay shipped behind module exports; v3 (if needed) is a separate spec. The two-version plan caps the cost of indecision at the implementation phase. |
| R6 | SCSS `@use` import path differs from project convention (does the project use `@use`, `@import`, or a different convention?) | Low | Medium | Check `src/styles.scss` for the existing pattern in Phase 1. Match it. (If `@use` isn't used elsewhere, fall back to `@import` to match.) |
| R7 | Demo page becomes too long (already 312 lines of HTML) | Low | Medium | Add the new section near the bottom; link from TOC. Keep section markup compact (≤80 lines). |

---

## 9. Architecture Decision Records (embedded)

These are decisions that future engineers/agents will need context for. Embedded here rather than in `specs/decisions/ADR-XXX.md` because they're feature-scoped — promote individual ADRs out of this file if any becomes a project-wide stance.

### ADR-1: Ship two parallel directives, evaluate, delete one
**Status:** Accepted
**Context:** Two defensible mechanisms (CSS+setTimeout vs WAAPI) exist with different trade-offs in testability, themeability, and code surface. Picking one upfront is guesswork.
**Decision:** Ship both. Demo page renders both side-by-side on the same data. Evaluate against the 5-criteria rubric in `spec.md` §11. Delete the loser post-evaluation.
**Alternatives considered:**
- *Single directive with a config flag* — adds complexity (branch in every method), defeats the purpose of comparison.
- *Pick CSS+setTimeout upfront* — defensible (project standard tools), but doesn't surface the WAAPI option's real ergonomics.
- *Pick WAAPI upfront* — more "modern", but reduces themeability (keyframes in TS) without measured payoff.
**Consequences:** ~50% more code than picking one. ~50% more tests. The cost is bounded — both directives are small (≤80 lines each). Net cost = a few extra hours; net benefit = an informed decision instead of a coin flip.

### ADR-2: No `@angular/animations` triggers
**Status:** Accepted
**Context:** Angular ships an animation system (`trigger`/`state`/`transition`) tied to `BrowserAnimationsModule`.
**Decision:** Don't use it for either version.
**Alternatives considered:**
- *`@angular/animations` triggers* — runs on the JS thread (not compositor), couples consumers to `BrowserAnimationsModule` (which is currently imported but shouldn't be a contract for this directive), heavier abstraction (`AnimationBuilder`, `AnimationPlayer`) for what is "fade one color over time".
**Consequences:** Both versions are framework-agnostic at the DOM layer. The animation can be ported to React/Vue/etc. with minimal change.

### ADR-3: `Object.is` for equality
**Status:** Accepted
**Context:** Need to detect "value actually changed". `===` and `Object.is` differ on `NaN` (===: false, Object.is: true) and `+0/-0` (===: true, Object.is: false).
**Decision:** Use `Object.is(prev, next)`.
**Alternatives considered:**
- *`===`* — `NaN !== NaN` would cause spurious flashes if a numeric cell ever held `NaN` (a real possibility for sentinel values from a websocket).
- *Pluggable comparator input* — explicitly rejected by user during spec phase ("keep it simple, values are primitives").
**Consequences:** No flash on `NaN → NaN`. No flash on `+0 → +0`. Spurious flash on `+0 → -0` (acceptable; vanishingly rare for table data).

### ADR-4: Suppress flash on first emission
**Status:** Accepted
**Context:** When a table first renders, every cell goes from `undefined` → its initial value. Without suppression, the entire table flashes simultaneously on load.
**Decision:** Track a per-instance `hasSeenFirstValue` boolean. First `ngOnChanges` flips it; no flash that pass.
**Alternatives considered:**
- *Flash on first emission* — explicit user choice during spec phase: NO.
- *Skip flashes for the first 500 ms after construction* — relies on a magic number; doesn't compose well with deferred render scenarios.
**Consequences:** Cells loaded after the directive instantiates (e.g., `*ngIf` flipping) won't get an initial flash. Matches "this changed since I last looked" semantics.

### ADR-5: Wrap setTimeout in `NgZone.runOutsideAngular` (Version A only)
**Status:** Accepted
**Context:** zone.js patches `setTimeout` so its callbacks trigger Angular change detection. With 1 000 cells flashing per WebSocket tick, that's 1 000 unnecessary CD ticks.
**Decision:** Inject `NgZone`. Wrap `setTimeout` in `this.zone.runOutsideAngular(() => ...)`. The cleanup callback uses `Renderer2.removeClass` only — no Angular state involved.
**Alternatives considered:**
- *Plain `setTimeout`* — fine for tables under ~100 cells; not for the spec's 1000-cell target.
- *Skip the timer entirely (rely on `animation-fill-mode: forwards`)* — leaves the class on the element forever; breaks mid-flash restart and reduced-motion cleanup. Rejected.
**Consequences:** Two extra lines per directive instance, zero CD overhead.

### ADR-6: Keyframes in SCSS (Version A) and TS (Version B) — by mechanism, not preference
**Status:** Accepted
**Context:** Each implementation has a natural home for the keyframe definition.
**Decision:**
- Version A: `_cell-flash-on-change.scss` (Angular directives have no `styleUrls`; global SCSS is the right place).
- Version B: inline TS `Keyframe[]` array passed to `Element.animate()`.
**Alternatives considered:**
- *Version A keyframes inline in TS via `CSSStyleSheet`* — adds runtime DOM injection; more code than just shipping the SCSS.
- *Version B keyframes in SCSS, read via `getComputedStyle`* — convoluted; defeats the point of WAAPI.
**Consequences:** Themeability difference becomes one of the 5 evaluation criteria (Version A wins for design-system overrides; Version B is fine if the directive lives in isolation).

---

## 10. Open Questions

1. **SCSS placement** — `src/styles/_cell-flash-on-change.scss` (preferred, new subfolder) vs. inline append in `src/styles.scss`. Will check existing `src/styles.scss` content during Phase 1; whichever matches the existing convention wins.
2. **Optional inset box-shadow for low-vision a11y** — adding `box-shadow: inset 0 0 0 2px rgba(255, 178, 0, 0.9)` on top of the background change makes the flash visible to users who can't perceive the soft amber. Defer the decision until after the demo is interactive — eyeball it first.

---

## Next Steps

1. Review this plan + the spec.
2. Run `/tasks cell-flash-on-change` to break this into actionable development tasks.
3. Run `/implement cell-flash-on-change` to execute (TDD per the project's `test-driven-development` skill).

---

*Plan created with SDD 2.0; cross-referenced with `.cursor/skills/{angular-engineering, frontend-ui-engineering, performance-optimization, rtl-bidi-ui, documentation-and-adrs, code-simplification, test-driven-development}/SKILL.md`.*
