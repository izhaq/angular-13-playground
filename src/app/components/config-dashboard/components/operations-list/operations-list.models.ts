import { DropdownOption } from '../../../app-dropdown/app-dropdown.models';

export interface OperationsValue {
  ttm: string;
  weather: string;
  videoRec: string;
  videoType: string[];
  headlights: string;
  pwrOnOff: string;
  force: string;
  stability: string;
  cruiseCtrl: string;
  plr: string;
  aux: string;
}

export type OperationsKey = keyof OperationsValue;

export interface OperationsFieldConfig {
  key: OperationsKey;
  label: string;
  options: DropdownOption[];
  multi?: boolean;
}

const TTM_OPTIONS: DropdownOption[] = [
  { value: 'not-active', label: 'Not Active', abbr: 'N/A' },
  { value: 'real', label: 'Real', abbr: 'REA' },
  { value: 'captive', label: 'Captive', abbr: 'CAP' },
];

const WEATHER_OPTIONS: DropdownOption[] = [
  { value: 'no', label: 'No', abbr: 'NO' },
  { value: 'yes', label: 'Yes', abbr: 'YES' },
];

const VIDEO_REC_OPTIONS: DropdownOption[] = [
  { value: 'internal', label: 'Internal', abbr: 'INT' },
  { value: 'external', label: 'External', abbr: 'EXT' },
];

const VIDEO_TYPE_OPTIONS: DropdownOption[] = [
  { value: 'no', label: 'No', abbr: 'NO' },
  { value: 'hd', label: 'HD', abbr: 'HD' },
  { value: '4k', label: '4K', abbr: '4K' },
  { value: '8k', label: '8K', abbr: '8K' },
];

const HEADLIGHTS_OPTIONS: DropdownOption[] = [
  { value: 'no', label: 'No', abbr: 'NO' },
  { value: 'yes', label: 'Yes', abbr: 'YES' },
];

const PWR_ON_OFF_OPTIONS: DropdownOption[] = [
  { value: 'on', label: 'On', abbr: 'ON' },
  { value: 'off', label: 'Off', abbr: 'OFF' },
];

const FORCE_OPTIONS: DropdownOption[] = [
  { value: 'normal', label: 'Normal', abbr: 'NRM' },
  { value: 'force-f', label: 'Force F', abbr: 'FRC' },
  { value: 'force-no', label: 'Force No', abbr: 'FNO' },
];

const STABILITY_OPTIONS: DropdownOption[] = [
  { value: 'no', label: 'No', abbr: 'NO' },
  { value: 'yes', label: 'Yes', abbr: 'YES' },
];

const CRUISE_CTRL_OPTIONS: DropdownOption[] = [
  { value: 'no', label: 'No', abbr: 'NO' },
  { value: 'yes', label: 'Yes', abbr: 'YES' },
];

const PLR_OPTIONS: DropdownOption[] = [
  { value: 'no', label: 'No', abbr: 'NO' },
  { value: 'yes', label: 'Yes', abbr: 'YES' },
];

const AUX_OPTIONS: DropdownOption[] = [
  { value: 'no', label: 'No', abbr: 'NO' },
  { value: 'yes', label: 'Yes', abbr: 'YES' },
];

export const OPERATIONS_FIELDS: OperationsFieldConfig[] = [
  { key: 'ttm', label: 'TTM', options: TTM_OPTIONS },
  { key: 'weather', label: 'Weather', options: WEATHER_OPTIONS },
  { key: 'videoRec', label: 'Video rec', options: VIDEO_REC_OPTIONS },
  { key: 'videoType', label: 'Video Type', options: VIDEO_TYPE_OPTIONS, multi: true },
  { key: 'headlights', label: 'Headlights', options: HEADLIGHTS_OPTIONS },
  { key: 'pwrOnOff', label: 'PWR On/Off', options: PWR_ON_OFF_OPTIONS },
  { key: 'force', label: 'Force', options: FORCE_OPTIONS },
  { key: 'stability', label: 'Stability', options: STABILITY_OPTIONS },
  { key: 'cruiseCtrl', label: 'Cruise Ctrl', options: CRUISE_CTRL_OPTIONS },
  { key: 'plr', label: 'PLR', options: PLR_OPTIONS },
  { key: 'aux', label: 'AUX', options: AUX_OPTIONS },
];

export const OPERATIONS_KEYS: OperationsKey[] =
  OPERATIONS_FIELDS.map(f => f.key);

export const DEFAULT_OPERATIONS: OperationsValue = {
  ttm: 'not-active',
  weather: 'no',
  videoRec: 'internal',
  videoType: ['no'],
  headlights: 'no',
  pwrOnOff: 'on',
  force: 'normal',
  stability: 'no',
  cruiseCtrl: 'no',
  plr: 'no',
  aux: 'no',
};
