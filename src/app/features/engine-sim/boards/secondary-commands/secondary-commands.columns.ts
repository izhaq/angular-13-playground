import { ENGINE_SIM_LABELS as L } from '../../shared/engine-sim.labels';
import { GridColumn } from '../../shared/engine-sim.models';
import { PRIMARY_COMMANDS_COLUMNS } from '../primary-commands/primary-commands.columns';

/**
 * 11-column grid: L1-L4 + R1-R4 (reused) + TLL + TLR + GDL.
 * Reusing the 8-column array keeps both grids in lockstep if column ids change.
 */
export const SECONDARY_COMMANDS_COLUMNS: GridColumn[] = [
  ...PRIMARY_COMMANDS_COLUMNS,
  { id: 'tll', label: L.colTll },
  { id: 'tlr', label: L.colTlr },
  { id: 'gdl', label: L.colGdl },
];
