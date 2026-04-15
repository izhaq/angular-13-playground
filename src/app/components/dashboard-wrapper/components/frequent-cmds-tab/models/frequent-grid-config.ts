import { GridConfig } from '../../status-grid/models/grid.models';
import { GRID_COLUMNS } from '../../status-grid/models/grid-columns';
import { buildGridRowDefs } from '../../status-grid/models/grid-defaults';

export const FREQUENT_GRID_CONFIG: GridConfig = {
  rows: buildGridRowDefs(),
  columns: GRID_COLUMNS,
};
