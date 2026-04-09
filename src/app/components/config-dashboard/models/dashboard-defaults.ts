import { DashboardState } from './dashboard.models';
import { GridCell, GridColumn, GridRow } from './grid.models';
import {
  DEFAULT_VEHICLE_CONTROLS,
  VEHICLE_CONTROL_FIELDS,
} from '../components/operations-list/operations-list.models';

export const DEFAULT_STATE: DashboardState = {
  scenario: 'highway-cruise',
  driveCommand: { transmission: 'automatic', driveMode: '2wd' },
  vehicleControls: { ...DEFAULT_VEHICLE_CONTROLS },
};

function formatConfirmedValue(controlValue: string | string[]): string {
  return Array.isArray(controlValue) ? controlValue.join(', ') : controlValue;
}

export function buildInitialGridRows(columns: GridColumn[]): GridRow[] {
  const emptyCells = (cols: GridColumn[]): GridCell[] =>
    cols.map((c) => ({ columnId: c.id, active: false }));

  return VEHICLE_CONTROL_FIELDS.map((field) => ({
    field: `vehicleControls.${field.key}`,
    label: field.label,
    confirmedValue: formatConfirmedValue(DEFAULT_STATE.vehicleControls[field.key]),
    cells: emptyCells(columns),
  }));
}
