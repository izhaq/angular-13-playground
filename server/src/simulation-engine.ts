import { DashboardState, FieldUpdate, VehicleControls } from './models';

const COLUMN_IDS = ['red', 'yellow', 'green', 'n', 'p', 'l'];

type VehicleControlKey = keyof VehicleControls;

const FIELD_LABELS: Record<VehicleControlKey, string> = {
  terrain: 'Terrain',
  weather: 'Weather',
  speedLimit: 'Speed Limit',
  gear: 'Gear',
  headlights: 'Headlights',
  wipers: 'Wipers',
  tractionCtrl: 'Traction Ctrl',
  stability: 'Stability',
  cruiseCtrl: 'Cruise Ctrl',
  brakeAssist: 'Brake Assist',
};

function formatValue(val: string | string[]): string {
  return Array.isArray(val) ? val.join(', ') : val;
}

function generateStatuses(fieldKey: string, value: string | string[]): Record<string, boolean> {
  const seed = hashCode(fieldKey + JSON.stringify(value));
  const statuses: Record<string, boolean> = {};
  COLUMN_IDS.forEach((col, i) => {
    statuses[col] = ((seed >> i) & 1) === 1;
  });
  return statuses;
}

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

export function processConfig(state: DashboardState): FieldUpdate[] {
  const updates: FieldUpdate[] = [];
  const controls = state.vehicleControls;

  (Object.keys(FIELD_LABELS) as VehicleControlKey[]).forEach((key) => {
    const rawValue = controls[key];
    const value = formatValue(rawValue);
    updates.push({
      field: `vehicleControls.${key}`,
      value,
      statuses: generateStatuses(key, rawValue),
    });
  });

  return updates;
}
