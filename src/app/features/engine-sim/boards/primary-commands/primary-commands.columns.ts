import { COL_IDS } from '../../shared/column-ids';
import { ENGINE_SIM_LABELS as L } from '../../shared/engine-sim.labels';
import { GridColumn } from '../../shared/engine-sim.models';

const LEFT_LABELS  = [L.colL1, L.colL2, L.colL3, L.colL4];
const RIGHT_LABELS = [L.colR1, L.colR2, L.colR3, L.colR4];

/** 8-column grid: L1-L4 + R1-R4. */
export const PRIMARY_COMMANDS_COLUMNS: GridColumn[] = [
  ...COL_IDS.left.map((id, i)  => ({ id, label: LEFT_LABELS[i]  })),
  ...COL_IDS.right.map((id, i) => ({ id, label: RIGHT_LABELS[i] })),
];
