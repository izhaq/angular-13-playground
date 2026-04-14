import { DropdownOption } from '../../../app-dropdown/app-dropdown.models';

export interface CmdSelection {
  sides: string[];
  wheels: string[];
}

export const SIDE_OPTIONS: DropdownOption[] = [
  { value: 'left', label: 'Left' },
  { value: 'right', label: 'Right' },
];

export const WHEEL_OPTIONS: DropdownOption[] = [
  { value: '1', label: '1' },
  { value: '2', label: '2' },
  { value: '3', label: '3' },
  { value: '4', label: '4' },
];

export const DEFAULT_CMD_SELECTION: CmdSelection = {
  sides: ['left'],
  wheels: ['1'],
};
