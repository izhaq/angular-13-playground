import { DashboardState } from './dashboard.models';
import { GridColumnDef, GridRowDef, RowViewModel } from './grid.models';
import { DEFAULT_CMD_SELECTION } from '../components/cmd-panel/cmd-panel.models';
import {
  DEFAULT_OPERATIONS,
  OPERATIONS_FIELDS,
} from '../components/operations-list/operations-list.models';

export const DEFAULT_STATE: DashboardState = {
  scenario: 'highway-cruise',
  cmd: { ...DEFAULT_CMD_SELECTION },
  operations: { ...DEFAULT_OPERATIONS },
};

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
