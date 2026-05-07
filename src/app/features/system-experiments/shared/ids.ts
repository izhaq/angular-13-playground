/**
 * System Experiments string-id namespaces — board ids and grid-column ids.
 * Co-located because they're the same kind of thing (canonical string
 * identifiers for the feature) and merging avoids a two-file folder.
 */

/**
 * Stable identifiers used in `data-test-id` attributes so Playwright
 * selectors stay unique even when both boards are mounted at the same
 * time (Material tabs render eagerly by default).
 *
 * Test ID conventions (centralized — all components agree):
 *   form-{boardId}-{fieldKey}              e.g. form-primary-tff
 *   footer-{action}                        e.g. footer-apply
 *   grid-{boardId}-{fieldKey}-{colId}      e.g. grid-primary-tff-left1
 *   grid-header-{boardId}-{colId}          e.g. grid-header-secondary-tll
 *   grid-label-{boardId}-{fieldKey}        e.g. grid-label-primary-abort
 *
 * Footer is intentionally NOT namespaced: it's a singleton mounted by
 * the shell outside the tab-group.
 */
export const BOARD_IDS = {
  primary:   'primary',
  secondary: 'secondary',
} as const;

export type BoardId = typeof BOARD_IDS[keyof typeof BOARD_IDS];

/**
 * Canonical grid column ids — single source of truth for both the
 * `*.columns.ts` definitions and the wire normalizer.
 */
export const COL_IDS = {
  left:  ['left1',  'left2',  'left3',  'left4']  as const,
  right: ['right1', 'right2', 'right3', 'right4'] as const,
  tll: 'tll',
  tlr: 'tlr',
  gdl: 'gdl',
} as const;

export type LeftColId  = typeof COL_IDS.left[number];
export type RightColId = typeof COL_IDS.right[number];

export type GridColId =
  | LeftColId
  | RightColId
  | typeof COL_IDS.tll
  | typeof COL_IDS.tlr
  | typeof COL_IDS.gdl;
