import {
  GridColumn,
  GridConfig,
} from '../components/config-dashboard/models/grid.models';
import { DropdownOption } from '../components/app-dropdown/app-dropdown.models';

export const SCENARIOS: DropdownOption[] = [
  { value: 'highway-cruise', label: 'Highway Cruise' },
  { value: 'city-traffic', label: 'City Traffic' },
  { value: 'off-road-trail', label: 'Off-Road Trail' },
  { value: 'realtime', label: 'Realtime' },
];

export const GRID_COLUMNS: GridColumn[] = [
  { id: 'red', label: '', type: 'color', color: '#ee7d77' },
  { id: 'yellow', label: '', type: 'color', color: '#f0c75e' },
  { id: 'green', label: '', type: 'color', color: '#6ecf6e' },
  { id: 'n', label: 'N', type: 'text' },
  { id: 'p', label: 'P', type: 'text' },
  { id: 'l', label: 'L', type: 'text' },
];

export const DEFAULT_GRID_CONFIG: GridConfig = {
  columns: GRID_COLUMNS,
};
