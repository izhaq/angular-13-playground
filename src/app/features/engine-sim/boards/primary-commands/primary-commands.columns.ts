import { ENGINE_SIM_LABELS as L } from '../../shared/engine-sim.labels';
import { GridColumn } from '../../shared/engine-sim.models';

/** 8-column grid: L1-L4 + R1-R4. */
export const PRIMARY_COMMANDS_COLUMNS: GridColumn[] = [
  { id: 'left1',  label: L.colL1 },
  { id: 'left2',  label: L.colL2 },
  { id: 'left3',  label: L.colL3 },
  { id: 'left4',  label: L.colL4 },
  { id: 'right1', label: L.colR1 },
  { id: 'right2', label: L.colR2 },
  { id: 'right3', label: L.colR3 },
  { id: 'right4', label: L.colR4 },
];
