import {
  GridColumnDef,
  GridConfig,
} from '../components/config-dashboard/components/status-grid/grid.models';
import { DropdownOption } from '../components/app-dropdown/app-dropdown.models';
import { buildGridRowDefs } from '../components/config-dashboard/components/status-grid/grid-defaults';

export const SCENARIOS: DropdownOption[] = [
  { value: 'highway-cruise', label: 'Highway Cruise' },
  { value: 'city-traffic', label: 'City Traffic' },
  { value: 'off-road-trail', label: 'Off-Road Trail' },
  { value: 'realtime', label: 'Realtime' },
];

export const GRID_COLUMNS: GridColumnDef[] = [
  { id: 'L1', header: 'L1' },
  { id: 'L2', header: 'L2' },
  { id: 'L3', header: 'L3' },
  { id: 'L4', header: 'L4' },
  { id: 'R1', header: 'R1' },
  { id: 'R2', header: 'R2' },
  { id: 'R3', header: 'R3' },
  { id: 'R4', header: 'R4' },
];

export const DEFAULT_GRID_CONFIG: GridConfig = {
  rows: buildGridRowDefs(),
  columns: GRID_COLUMNS,
};
