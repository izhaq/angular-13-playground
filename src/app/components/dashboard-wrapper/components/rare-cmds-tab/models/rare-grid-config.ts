import { GridConfig } from '../../status-grid/models/grid.models';
import { GRID_COLUMNS } from '../../status-grid/models/grid-columns';
import { buildRareGridRowDefs } from '../../status-grid/models/grid-defaults';

export const RARE_GRID_CONFIG: GridConfig = {
  rows: buildRareGridRowDefs(),
  columns: GRID_COLUMNS,
};
