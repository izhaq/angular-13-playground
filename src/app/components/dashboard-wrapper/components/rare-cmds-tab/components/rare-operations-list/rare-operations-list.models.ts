import { DropdownOption } from '../../../../../app-dropdown/app-dropdown.models';

export interface RareOperationsModel {
  absCriticalFail: string;
  absWarningFail: string;
  absFatalFail: string;
  brakeCriticalFail: string;
  masterResetFail: string;
  flashCriticalFail: string;
  busTempFail: string;
  tireCommFail: string;
  fuelMapTempFail: string;
  coolantCriticalFail: string;
}

export type RareOperationsKey = keyof RareOperationsModel;

export interface RareOperationsFieldConfig {
  key: RareOperationsKey;
  label: string;
  options: DropdownOption[];
}

const YES_NO_OPTIONS: DropdownOption[] = [
  { value: 'no', label: 'No', abbr: 'NO' },
  { value: 'yes', label: 'Yes', abbr: 'YES' },
];

const NORMAL_FORCE_IGNORE_OPTIONS: DropdownOption[] = [
  { value: 'normal', label: 'Normal', abbr: 'NRM' },
  { value: 'force', label: 'Force', abbr: 'FRC' },
  { value: 'ignore', label: 'Ignore', abbr: 'IGN' },
];

export const RARE_OPERATIONS_FIELDS: RareOperationsFieldConfig[] = [
  { key: 'absCriticalFail', label: 'ABS Critical Fail', options: NORMAL_FORCE_IGNORE_OPTIONS },
  { key: 'absWarningFail', label: 'ABS Warning Fail', options: NORMAL_FORCE_IGNORE_OPTIONS },
  { key: 'absFatalFail', label: 'ABS Fatal Fail', options: NORMAL_FORCE_IGNORE_OPTIONS },
  { key: 'brakeCriticalFail', label: 'Brake Critical Fail', options: NORMAL_FORCE_IGNORE_OPTIONS },
  { key: 'masterResetFail', label: 'Master Reset Fail', options: NORMAL_FORCE_IGNORE_OPTIONS },
  { key: 'flashCriticalFail', label: 'Flash Critical Fail', options: NORMAL_FORCE_IGNORE_OPTIONS },
  { key: 'busTempFail', label: 'Bus Temp Fail', options: NORMAL_FORCE_IGNORE_OPTIONS },
  { key: 'tireCommFail', label: 'Tire Comm Fail', options: YES_NO_OPTIONS },
  { key: 'fuelMapTempFail', label: 'Fuel Map Temp Fail', options: NORMAL_FORCE_IGNORE_OPTIONS },
  { key: 'coolantCriticalFail', label: 'Coolant Critical Fail', options: NORMAL_FORCE_IGNORE_OPTIONS },
];

export const RARE_OPERATIONS_KEYS: RareOperationsKey[] =
  RARE_OPERATIONS_FIELDS.map(f => f.key);

export const DEFAULT_RARE_OPERATIONS: RareOperationsModel = {
  absCriticalFail: 'normal',
  absWarningFail: 'normal',
  absFatalFail: 'normal',
  brakeCriticalFail: 'normal',
  masterResetFail: 'normal',
  flashCriticalFail: 'normal',
  busTempFail: 'normal',
  tireCommFail: 'no',
  fuelMapTempFail: 'normal',
  coolantCriticalFail: 'normal',
};
