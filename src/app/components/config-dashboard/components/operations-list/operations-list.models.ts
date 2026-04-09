import { DropdownOption } from '../../../app-dropdown/app-dropdown.models';

export interface VehicleControls {
  terrain: string[];
  weather: string[];
  speedLimit: string;
  gear: string;
  headlights: string;
  wipers: string;
  tractionCtrl: string;
  stability: string;
  cruiseCtrl: string;
  brakeAssist: string;
}

export type VehicleControlKey = keyof VehicleControls;

export interface VehicleControlFieldConfig {
  key: VehicleControlKey;
  label: string;
  options: DropdownOption[];
}

const TERRAIN_OPTIONS: DropdownOption[] = [
  { value: 'asphalt', label: 'Asphalt' },
  { value: 'gravel', label: 'Gravel' },
  { value: 'sand', label: 'Sand' },
  { value: 'mud', label: 'Mud' },
  { value: 'snow', label: 'Snow' },
];

const WEATHER_OPTIONS: DropdownOption[] = [
  { value: 'clear', label: 'Clear' },
  { value: 'rain', label: 'Rain' },
  { value: 'fog', label: 'Fog' },
  { value: 'snow', label: 'Snow' },
  { value: 'wind', label: 'Wind' },
];

const SPEED_LIMIT_OPTIONS: DropdownOption[] = [
  { value: '30', label: '30 km/h' },
  { value: '60', label: '60 km/h' },
  { value: '90', label: '90 km/h' },
  { value: '120', label: '120 km/h' },
  { value: 'unlimited', label: 'Unlimited' },
];

const GEAR_OPTIONS: DropdownOption[] = [
  { value: 'p', label: 'P' },
  { value: 'r', label: 'R' },
  { value: 'n', label: 'N' },
  { value: 'd', label: 'D' },
];

const HEADLIGHTS_OPTIONS: DropdownOption[] = [
  { value: 'off', label: 'Off' },
  { value: 'low-beam', label: 'Low Beam' },
  { value: 'high-beam', label: 'High Beam' },
  { value: 'auto', label: 'Auto' },
];

const WIPERS_OPTIONS: DropdownOption[] = [
  { value: 'off', label: 'Off' },
  { value: 'interval', label: 'Interval' },
  { value: 'slow', label: 'Slow' },
  { value: 'fast', label: 'Fast' },
];

const TRACTION_OPTIONS: DropdownOption[] = [
  { value: 'on', label: 'On' },
  { value: 'off', label: 'Off' },
  { value: 'sport', label: 'Sport' },
];

const STABILITY_OPTIONS: DropdownOption[] = [
  { value: 'esc-on', label: 'ESC On' },
  { value: 'esc-off', label: 'ESC Off' },
];

const CRUISE_OPTIONS: DropdownOption[] = [
  { value: 'off', label: 'Off' },
  { value: 'set-60', label: 'Set 60' },
  { value: 'set-90', label: 'Set 90' },
  { value: 'set-120', label: 'Set 120' },
  { value: 'adaptive', label: 'Adaptive' },
];

const BRAKE_OPTIONS: DropdownOption[] = [
  { value: 'abs-only', label: 'ABS Only' },
  { value: 'abs-ebd', label: 'ABS+EBD' },
  { value: 'full-assist', label: 'Full Assist' },
];

export const VEHICLE_CONTROL_FIELDS: VehicleControlFieldConfig[] = [
  { key: 'terrain', label: 'Terrain', options: TERRAIN_OPTIONS },
  { key: 'weather', label: 'Weather', options: WEATHER_OPTIONS },
  { key: 'speedLimit', label: 'Speed Limit', options: SPEED_LIMIT_OPTIONS },
  { key: 'gear', label: 'Gear', options: GEAR_OPTIONS },
  { key: 'headlights', label: 'Headlights', options: HEADLIGHTS_OPTIONS },
  { key: 'wipers', label: 'Wipers', options: WIPERS_OPTIONS },
  { key: 'tractionCtrl', label: 'Traction Ctrl', options: TRACTION_OPTIONS },
  { key: 'stability', label: 'Stability', options: STABILITY_OPTIONS },
  { key: 'cruiseCtrl', label: 'Cruise Ctrl', options: CRUISE_OPTIONS },
  { key: 'brakeAssist', label: 'Brake Assist', options: BRAKE_OPTIONS },
];

export const VEHICLE_CONTROL_KEYS: VehicleControlKey[] =
  VEHICLE_CONTROL_FIELDS.map(f => f.key);

export const DEFAULT_VEHICLE_CONTROLS: VehicleControls = {
  terrain: ['asphalt'],
  weather: ['clear'],
  speedLimit: '90',
  gear: 'p',
  headlights: 'off',
  wipers: 'off',
  tractionCtrl: 'on',
  stability: 'esc-on',
  cruiseCtrl: 'off',
  brakeAssist: 'abs-ebd',
};
