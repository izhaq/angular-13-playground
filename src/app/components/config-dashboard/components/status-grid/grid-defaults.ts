import { GridColumnDef, GridRowDef, RowViewModel } from './grid.models';
import { OPERATIONS_FIELDS } from '../operations-list/operations-list.models';
import { CMD_TEST_FIELDS } from '../cmd-test-panel/cmd-test-panel.models';

const ALL_GRID_FIELDS = [...OPERATIONS_FIELDS, ...CMD_TEST_FIELDS];

export function buildGridRowDefs(): GridRowDef[] {
  return ALL_GRID_FIELDS.map((field) => ({
    field: field.key,
    label: field.label,
  }));
}

export function buildInitialGridRows(columns: GridColumnDef[]): RowViewModel[] {
  const emptyCells = (cols: GridColumnDef[]): Record<string, string> => {
    const cells: Record<string, string> = {};
    for (const col of cols) {
      cells[col.id] = '';
    }
    return cells;
  };

  return ALL_GRID_FIELDS.map((field) => ({
    field: field.key,
    label: field.label,
    cells: emptyCells(columns),
  }));
}
