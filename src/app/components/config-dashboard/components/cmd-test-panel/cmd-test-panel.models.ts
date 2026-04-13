import { DropdownOption } from '../../../app-dropdown/app-dropdown.models';

export interface CmdTestModel {
  nta: string;
  tisMtrRec: string;
  rideMtrRec: string;
}

export type CmdTestKey = keyof CmdTestModel;

export interface CmdTestFieldConfig {
  key: CmdTestKey;
  label: string;
  options: DropdownOption[];
}

const YES_NO_OPTIONS: DropdownOption[] = [
  { value: 'no', label: 'No', abbr: 'NO' },
  { value: 'yes', label: 'Yes', abbr: 'YES' },
];

export const CMD_TEST_FIELDS: CmdTestFieldConfig[] = [
  { key: 'nta', label: 'Nta', options: YES_NO_OPTIONS },
  { key: 'tisMtrRec', label: 'Tis Mtr Rec', options: YES_NO_OPTIONS },
  { key: 'rideMtrRec', label: 'Ride Mtr Rec', options: YES_NO_OPTIONS },
];

export const CMD_TEST_KEYS: CmdTestKey[] =
  CMD_TEST_FIELDS.map(f => f.key);

export const DEFAULT_CMD_TEST: CmdTestModel = {
  nta: 'no',
  tisMtrRec: 'no',
  rideMtrRec: 'no',
};
