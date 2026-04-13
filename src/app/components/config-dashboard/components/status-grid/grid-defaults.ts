import { GridColumnDef, GridRowDef, RowViewModel } from './grid.models';
import { OPERATIONS_FIELDS } from '../operations-list/operations-list.models';

export function buildGridRowDefs(): GridRowDef[] {
  return OPERATIONS_FIELDS.map((field) => ({
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

  return OPERATIONS_FIELDS.map((field) => ({
    field: field.key,
    label: field.label,
    cells: emptyCells(columns),
  }));
}
