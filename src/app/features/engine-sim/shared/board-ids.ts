/**
 * Stable, board-scoping identifiers used in `data-test-id` attributes so
 * Playwright selectors stay unique even when both boards are mounted in the
 * DOM at the same time (Material tabs render eagerly by default).
 *
 * Test ID conventions (centralized so all components agree):
 *   form-{boardId}-{fieldKey}              e.g. form-primary-tff
 *   footer-{boardId}-{action}              e.g. footer-secondary-apply
 *   grid-{boardId}-{fieldKey}-{colId}      e.g. grid-primary-tff-left1
 *   grid-header-{boardId}-{colId}          e.g. grid-header-secondary-tll
 *   grid-label-{boardId}-{fieldKey}        e.g. grid-label-primary-abort
 *
 * Why namespace by board even though field keys happen not to collide today:
 *   - Both boards share grid column ids (left1..right4) — without a board
 *     prefix, `grid-{fieldKey}-{colId}` would clash the moment any field key
 *     appears in both boards (a likely future change).
 *   - Footer / form ids would silently overlap between tabs without it.
 */
export const BOARD_IDS = {
  primary:   'primary',
  secondary: 'secondary',
} as const;

export type BoardId = typeof BOARD_IDS[keyof typeof BOARD_IDS];
