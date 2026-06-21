# Feature Brief: Static Grid Header (extracted component, beside CMD)

**Task ID:** grid-header-extraction
**Created:** 2026-06-07
**Status:** Ready for Development

---

## Problem Statement

The grid's column header (`L1…R4` for Primary, `L1…GDL` for Secondary) currently lives
inside the scrolling body, on its own line below the CMD row, as part of the same CSS grid
as the form + data rows (`BoardRowsComponent`). Two consequences: (1) the header scrolls
away with the data, and (2) it consumes a vertical row inside the scroll area, squeezing the
main content (form controls + data cells). We want the column header pulled out into its own
component and pinned on the **same sticky band as the CMD section**, so it stays fixed while
the body scrolls and the main content gets more room.

## Target Users

Game engine operators / simulation engineers using the SYS Mode dashboard — they scroll the
field list while needing the `L1…GDL` column reference to stay visible at all times.

## Core Requirements

### Must Have
- [ ] Extract the column-header strip into a dedicated, reusable component
      (e.g. `GridHeaderComponent`) driven by a `columns` input.
- [ ] One component serves both boards — dynamic column count (8 for Primary, 11 for
      Secondary). Same component, different `columns` input.
- [ ] Header sits on the **same horizontal band as the CMD section** ("beside CMD"): the CMD
      title + side/wheel dropdowns fill the label/control area, and the column labels span the
      data columns on the same line.
- [ ] CMD + header band is **static (sticky)** — it does not scroll; only the form/data body
      below scrolls.
- [ ] Header columns stay **pixel-aligned** with the scrolling data columns below
      (see Technical Approach — Option A).
- [ ] Preserve existing `data-test-id`s on header cells: `grid-header-{boardId}-{colId}`
      (so Playwright selectors keep working).
- [ ] Data-cell hover still works in the body (existing behavior unchanged).
- [ ] **Single, easy lever for the form/grid space split.** The column template must be defined
      once and shared by both the header and the body (no duplicated track definition that can
      drift). Tuning how much horizontal space the grid takes vs the label/control side must be a
      one-place edit.

### Nice to Have
- [ ] Keep the label/control top-left area visually clean and aligned with the CMD controls.

### Explicitly Out of Scope (separate PRs)
- [ ] **Header ↔ data column hover sync** — keeping a synced highlight between the now-detached
      static header and the scrolling data column is its own dedicated PR. This PR keeps
      data-cell hover working but does **not** wire cross-component header/column hover sync.
- [ ] **Narrow-width data clipping bug** (see Open Questions / Known Issues) — not caused by and
      not fixed by this change.

## Technical Approach

Move the header markup out of `BoardRowsComponent` into a new `GridHeaderComponent`. Restructure
`BoardComponent` so the top sticky region holds CMD (in the label/control area) and the new
header (in the data area) on one line, with the form/data rows scrolling beneath. The body keeps
its single CSS grid for the form + data rows; the header reuses the **same column track
definition** so the two stay aligned.

**Alignment — Option A (chosen): share tracks + reserve a scrollbar gutter.**
Both the detached header and the scrolling body use the identical
`grid-template-columns` (driven by the existing `--data-col-count` custom property). To stop the
body's vertical scrollbar (~15px) from shifting the data columns out from under the fixed header,
reserve a scrollbar gutter on the scroll container (`scrollbar-gutter: stable`).

- Pros: deterministic — body reserves the same width whether or not a scrollbar shows, so columns
  always line up; one-line CSS; consistent across OSes.
- Cons: ~15px empty sliver on the right when no scrollbar is needed; `scrollbar-gutter` is
  modern-only (Safari 16.4+), so a small scrollbar-width fallback may be needed for older browsers.
- Note: reserving the gutter takes ~15px more horizontal width from the data area, which slightly
  worsens the narrow-width clipping issue noted below.

**Tuning the form/grid space split (single source of truth):**
Today the form side is fixed (`$label-col-w 140 + $control-col-w 100 + $form-grid-gap 24 = 264px`)
and the data columns (`minmax(0, 1fr)`) take the remainder, so **grid space = container width −
form-side width**. (`$form-grid-gap` changes the grid size only as a side effect by inflating the
gutter — it is not the intended lever.) After extraction the `grid-template-columns` line lives in
**two** components (header + body), so a local SCSS variable can no longer keep them in sync.

Fix: hoist the whole template into **one shared CSS custom property** on the common ancestor
(`BoardComponent` host) and have both components consume it verbatim:

```scss
// board.component — the ONE place to tune the form/grid split
:host {
  --se-label-col-w: 140px;
  --se-control-col-w: 100px;
  --se-form-grid-gap: 24px;
  --se-grid-columns:
    var(--se-label-col-w) var(--se-control-col-w) var(--se-form-grid-gap)
    repeat(var(--data-col-count), minmax(0, 1fr));
}
```
```scss
.grid-header,
.board-rows { grid-template-columns: var(--se-grid-columns); }
```

To give the grid more/less room, edit the form-side vars in that single block; the data columns
auto-expand into the freed space and header + body stay aligned because they read the same value.
`--data-col-count` stays per-component (8 vs 11). No per-row layout refactor required.

**Patterns to Follow:**
- `BoardComponent` content-projection + layout-SCSS pattern (sticky CMD on top, scrolling body
  below) — extend the sticky region to include the header.
- `BoardRowsComponent`'s existing `--data-col-count` + `repeat(var(--data-col-count), minmax(0, 1fr))`
  track definition — reuse verbatim in the header so tracks match.
- `GridColumn[]` model + `trackByColId` already used for the header `*ngFor`.
- Centralized labels (`SYSTEM_EXPERIMENTS_LABELS`) and `data-test-id` conventions from `spec.md`.

**Key Decisions:**
- Placement = "beside CMD" (same row): CMD fills label/control area, header labels fill data area.
- Alignment = Option A intent, realized via **one scroll container + a sticky top band**
  (`.board__scroll { overflow-y: auto; scrollbar-gutter: stable }` with `.board__top { position:
  sticky; top: 0 }`). Because the sticky band and the scrolling body share the *same* scroll
  container (and its reserved gutter), their data columns stay aligned automatically — no
  per-element gutter math.
- Reuse = single `GridHeaderComponent`, dynamic columns, same `grid-header-{boardId}-{colId}` ids.
- Hover sync = deferred to a dedicated follow-up PR.
- Form/grid split (single source of truth) = `--se-label-col-w` / `--se-control-col-w` /
  `--se-form-grid-gap` defined once on the board host, plus a derived
  `--se-form-side-width: calc(sum)`. The body grid consumes the three widths as its first tracks;
  the CMD slot's width is the derived sum; the header fills the remainder. (Refinement of the
  brief's single `--se-grid-columns` string: header and body legitimately need different templates
  — data-only vs full — so shared *width* vars are cleaner and keep the one-place tuning.)

## Next Actions

1. [x] Create `GridHeaderComponent` (`system-experiments-grid-header`) with `@Input() boardId`,
       `@Input() columns: GridColumn[]`; renders data-only header cells with
       `grid-header-{boardId}-{colId}` test-ids and a `--data-col-count` grid track.
2. [x] Remove the header row from `BoardRowsComponent` (template + SCSS); first body row is now a
       field row. Body grid consumes the shared `--se-*` width vars.
3. [x] Restructure `BoardComponent`: one `.board__scroll` container holding a sticky `.board__top`
       band (CMD on the form side + header on the data side, one line) and the scrolling
       `.board__rows`. Define `--se-label-col-w` / `--se-control-col-w` / `--se-form-grid-gap`
       (+ derived `--se-form-side-width`) once on the host.
4. [x] Apply `scrollbar-gutter: stable` on the single scroll container; the sticky band shares it,
       so header/body columns stay aligned during scroll.
5. [x] Wire `GridHeaderComponent` into the shell for both tabs (`primaryColumns` /
       `secondaryColumns`); declared + exported in `SystemExperimentsModule`.
6. [x] Updated `board-rows` + `board` specs, added `grid-header.component.spec.ts`; `ng test`
       (208 passing) + `ng build` green.

## Success Criteria

- [x] Scrolling the form/data body leaves the CMD + column-header band fixed in place.
- [x] Header columns remain aligned with the data columns below, with and without a body scrollbar.
- [x] Works for both Primary (8 cols) and Secondary (11 cols) with no per-board duplication.
- [x] All existing `grid-header-{boardId}-{colId}` test-ids resolve to the new component.
- [x] `ng build` and `ng test` pass; no `::ng-deep` / `!important` introduced.

## Open Questions / Known Issues

- **Narrow-width data clipping (known issue, out of scope):** at rendered widths well below the
  1150px design envelope (~660px observed), each data column shrinks to ~22px while
  `.board-rows__data-cell-text` keeps `max-width: 100%` and the cell keeps `padding: 0 10px`
  (20px). The text span collapses to ~0px and is clipped by `overflow: hidden`, so cells look
  empty even though the value is present in the DOM (verified: `grid-primary-tff-left1`
  textContent = `"NACV"`, color `rgb(31,31,31)`, span width `0px`). Headers survive because their
  text is not wrapped in a width-constrained span. Suggested follow-up: shrink/remove cell padding
  or set a sensible column min-width below a breakpoint. Reserving the scrollbar gutter (Option A)
  marginally reduces data width, so track this separately.
- Scrollbar-gutter browser-support fallback: confirm whether the migration target needs a
  pre-Safari-16.4 / older-browser JS fallback, or if `scrollbar-gutter: stable` alone is enough.

---

*Brief created with SDD 2.5 - Ready to code!*
