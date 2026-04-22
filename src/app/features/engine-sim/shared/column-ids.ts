/**
 * Canonical grid column ids — single source of truth.
 *
 * Used by:
 *  - `boards/<board>/*.columns.ts` (the GridColumn[] definitions)
 *  - `utils/grid-data.utils.ts` (wire normalization → flat-grid keys)
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
