import { DropdownOption } from '../../../../../app-dropdown/app-dropdown.models';

export interface RareOperationsModel {
  absCalibration: string;
  tractionDiag: string;
  steeringAlign: string;
  brakeBleed: string;
  suspReset: string;
  eepromFlash: string;
  canBusLog: string;
  tirePressInit: string;
  fuelMapSwitch: string;
  coolantPurge: string;
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

export const RARE_OPERATIONS_FIELDS: RareOperationsFieldConfig[] = [
  { key: 'absCalibration', label: 'ABS Calibration', options: YES_NO_OPTIONS },
  { key: 'tractionDiag', label: 'Traction Diag', options: YES_NO_OPTIONS },
  { key: 'steeringAlign', label: 'Steering Align', options: YES_NO_OPTIONS },
  { key: 'brakeBleed', label: 'Brake Bleed', options: YES_NO_OPTIONS },
  { key: 'suspReset', label: 'Susp Reset', options: YES_NO_OPTIONS },
  { key: 'eepromFlash', label: 'EEPROM Flash', options: YES_NO_OPTIONS },
  { key: 'canBusLog', label: 'CAN Bus Log', options: YES_NO_OPTIONS },
  { key: 'tirePressInit', label: 'Tire Press Init', options: YES_NO_OPTIONS },
  { key: 'fuelMapSwitch', label: 'Fuel Map Switch', options: YES_NO_OPTIONS },
  { key: 'coolantPurge', label: 'Coolant Purge', options: YES_NO_OPTIONS },
];

export const RARE_OPERATIONS_KEYS: RareOperationsKey[] =
  RARE_OPERATIONS_FIELDS.map(f => f.key);

export const DEFAULT_RARE_OPERATIONS: RareOperationsModel = {
  absCalibration: 'no',
  tractionDiag: 'no',
  steeringAlign: 'no',
  brakeBleed: 'no',
  suspReset: 'no',
  eepromFlash: 'no',
  canBusLog: 'no',
  tirePressInit: 'no',
  fuelMapSwitch: 'no',
  coolantPurge: 'no',
};
