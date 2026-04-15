import { GridColumnDef, GridConfig } from '../../status-grid/models/grid.models';
import { GRID_COLUMNS } from '../../status-grid/models/grid-columns';
import { buildRareGridRowDefs } from '../../status-grid/models/grid-defaults';

const RARE_EXTRA_COLUMNS: GridColumnDef[] = [
  { id: 'TTL', header: 'TTL' },
  { id: 'TTR', header: 'TTR' },
  { id: 'SSL', header: 'SSL' },
];

export const RARE_GRID_CONFIG: GridConfig = {
  rows: buildRareGridRowDefs(),
  columns: [...GRID_COLUMNS, ...RARE_EXTRA_COLUMNS],
};
