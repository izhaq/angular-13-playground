import { DashboardFormValue } from './dashboard-form.models';
import { GridCell, GridColumn, GridRow } from './grid.models';
import {
  DEFAULT_OPERATIONS_VALUE,
  OPERATIONS_KEYS,
} from '../components/operations-form-list/operations-form-list.models';

export const DEFAULT_FORM_VALUE: DashboardFormValue = {
  action: 'action-1',
  commands: { cmd1: 'cmd-opt-1', cmd2: 'cmd-opt-1' },
  operations: { ...DEFAULT_OPERATIONS_VALUE },
};

export function buildInitialGridRows(columns: GridColumn[]): GridRow[] {
  const emptyCells = (cols: GridColumn[]): GridCell[] =>
    cols.map((c) => ({ columnId: c.id, active: false }));

  return OPERATIONS_KEYS.map((key, i) => ({
    field: `operations.${key}`,
    label: `act ${i + 1}`,
    confirmedValue: DEFAULT_FORM_VALUE.operations[key] ?? '',
    cells: emptyCells(columns),
  }));
}
