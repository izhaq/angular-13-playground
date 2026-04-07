import { DropdownOption } from '../../../app-dropdown/app-dropdown.models';

export interface CommandPair {
  cmd1: string;
  cmd2: string;
}

export const CMD_OPTIONS: DropdownOption[] = [
  { value: 'cmd-opt-1', label: 'CMD Option 1' },
  { value: 'cmd-opt-2', label: 'CMD Option 2' },
  { value: 'cmd-opt-3', label: 'CMD Option 3' },
];
