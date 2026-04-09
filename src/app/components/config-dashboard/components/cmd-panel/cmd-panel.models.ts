import { DropdownOption } from '../../../app-dropdown/app-dropdown.models';

export interface DriveCommand {
  transmission: string;
  driveMode: string;
}

export const TRANSMISSION_OPTIONS: DropdownOption[] = [
  { value: 'automatic', label: 'Automatic' },
  { value: 'manual', label: 'Manual' },
  { value: 'sport', label: 'Sport' },
  { value: 'eco', label: 'Eco' },
];

export const DRIVE_MODE_OPTIONS: DropdownOption[] = [
  { value: '2wd', label: '2WD' },
  { value: '4wd', label: '4WD' },
  { value: 'awd', label: 'AWD' },
];

export const DEFAULT_DRIVE_COMMAND: DriveCommand = { transmission: 'automatic', driveMode: '2wd' };
