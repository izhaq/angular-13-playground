import { GridColumnDef, GridRowDef, RowViewModel } from './grid.models';
import { OPERATIONS_FIELDS } from '../../frequent-cmds-tab/components/operations-list/operations-list.models';
import { CMD_TEST_FIELDS } from '../../frequent-cmds-tab/components/cmd-test-panel/cmd-test-panel.models';
import { RARE_OPERATIONS_FIELDS } from '../../rare-cmds-tab/components/rare-operations-list/rare-operations-list.models';

const ALL_GRID_FIELDS = [...OPERATIONS_FIELDS, ...CMD_TEST_FIELDS];

export function buildGridRowDefs(): GridRowDef[] {
  return ALL_GRID_FIELDS.map((field) => ({
    field: field.key,
    label: field.label,
  }));
}

export function buildRareGridRowDefs(): GridRowDef[] {
  return RARE_OPERATIONS_FIELDS.map((field) => ({
    field: field.key,
    label: field.label,
  }));
}

export function buildInitialGridRows(
  columns: GridColumnDef[],
  rowDefs: GridRowDef[],
): RowViewModel[] {
  const emptyCells: Record<string, string> = {};
  for (const col of columns) {
    emptyCells[col.id] = '';
  }

  return rowDefs.map((def) => ({
    field: def.field,
    label: def.label,
    cells: { ...emptyCells },
  }));
}
