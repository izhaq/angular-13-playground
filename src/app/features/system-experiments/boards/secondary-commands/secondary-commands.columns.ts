import { COL_IDS } from '../../shared/ids';
import { SYSTEM_EXPERIMENTS_LABELS as L } from '../../shared/labels';
import { GridColumn } from '../../shared/models';
import { PRIMARY_COMMANDS_COLUMNS } from '../primary-commands/primary-commands.columns';

/**
 * 11-column grid: L1-L4 + R1-R4 (reused) + TLL + TLR + GDL.
 * Reusing the 8-column array keeps both grids in lockstep if column ids change.
 */
export const SECONDARY_COMMANDS_COLUMNS: GridColumn[] = [
  ...PRIMARY_COMMANDS_COLUMNS,
  { id: COL_IDS.tll, label: L.colTll },
  { id: COL_IDS.tlr, label: L.colTlr },
  { id: COL_IDS.gdl, label: L.colGdl },
];
