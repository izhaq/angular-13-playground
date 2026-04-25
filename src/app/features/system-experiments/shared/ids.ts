/**
 * System Experiments string-id namespaces — board ids and grid-column ids.
 *
 * Both are `as const` value maps with derived literal-union types. Co-located
 * here because they're the same kind of thing (canonical string identifiers
 * for the feature) and merging avoids a two-file folder for ~60 lines of code.
 *
 * Types live next to the constants they're derived from. Free-standing
 * view-model types (CmdSelection, GridColumn, GridRow, FieldConfig, ...) live
 * in `models.ts`.
 */

// ---------------------------------------------------------------------------
// Board ids
// ---------------------------------------------------------------------------

/**
 * Stable, board-scoping identifiers used in `data-test-id` attributes so
 * Playwright selectors stay unique even when both boards are mounted in the
 * DOM at the same time (Material tabs render eagerly by default).
 *
 * Test ID conventions (centralized so all components agree):
 *   form-{boardId}-{fieldKey}              e.g. form-primary-tff
 *   footer-{action}                        e.g. footer-apply
 *   grid-{boardId}-{fieldKey}-{colId}      e.g. grid-primary-tff-left1
 *   grid-header-{boardId}-{colId}          e.g. grid-header-secondary-tll
 *   grid-label-{boardId}-{fieldKey}        e.g. grid-label-primary-abort
 *
 * Why namespace by board even though field keys happen not to collide today:
 *   - Both boards share grid column ids (left1..right4) — without a board
 *     prefix, `grid-{fieldKey}-{colId}` would clash the moment any field key
 *     appears in both boards (a likely future change).
 *   - Form ids would silently overlap between tabs without it (Material's
 *     mat-tabs lazy-renders the active tab today, but a future flip to
 *     preserveContent would mount both at once).
 *
 * Footer is intentionally NOT namespaced: it's a singleton mounted by the
 * shell outside the tab-group (one shared instance for both boards), so
 * `footer-{action}` is unambiguous by construction.
 */
export const BOARD_IDS = {
  primary:   'primary',
  secondary: 'secondary',
} as const;

export type BoardId = typeof BOARD_IDS[keyof typeof BOARD_IDS];

// ---------------------------------------------------------------------------
// Grid column ids
// ---------------------------------------------------------------------------

/**
 * Canonical grid column ids — single source of truth.
 *
 * Used by:
 *  - `boards/<board>/*.columns.ts` (the GridColumn[] definitions)
 *  - `api/grid-normalizer.ts` (wire normalization → flat-grid keys)
 *
 * Renaming a column id here changes both producers and consumers in lockstep.
 */
export const COL_IDS = {
  /** Left side: 4 columns matching `entities[0].mCommands[0..3]`. */
  left:  ['left1',  'left2',  'left3',  'left4']  as const,
  /** Right side: 4 columns matching `entities[1].mCommands[0..3]`. */
  right: ['right1', 'right2', 'right3', 'right4'] as const,
  /** Secondary's TLL column — sourced from `entities[0].aCommands`. */
  tll: 'tll',
  /** Secondary's TLR column — sourced from `entities[1].aCommands`. */
  tlr: 'tlr',
  /** Secondary's GDL column — sourced from `entities[0]` flat GDL props. */
  gdl: 'gdl',
} as const;

export type LeftColId  = typeof COL_IDS.left[number];
export type RightColId = typeof COL_IDS.right[number];

/** Union of every valid grid column id. */
export type GridColId =
  | LeftColId
  | RightColId
  | typeof COL_IDS.tll
  | typeof COL_IDS.tlr
  | typeof COL_IDS.gdl;
