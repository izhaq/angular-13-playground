import { DropdownOption } from '../../../app-dropdown/app-dropdown.models';

export interface OperationsValue {
  opr1: string;
  opr2: string;
  opr3: string;
  opr4: string;
  opr5: string;
  opr6: string;
  opr7: string;
  opr8: string;
  opr9: string;
  opr10: string;
}

export type OperationsKey = keyof OperationsValue;

export const OPERATIONS_KEYS: OperationsKey[] = [
  'opr1', 'opr2', 'opr3', 'opr4', 'opr5',
  'opr6', 'opr7', 'opr8', 'opr9', 'opr10',
];

export interface OperationFieldConfig {
  key: OperationsKey;
  label: string;
  options: DropdownOption[];
}

const SHARED_OPTIONS: DropdownOption[] = [
  { value: 'option-1', label: 'Option 1' },
  { value: 'option-2', label: 'Option 2' },
  { value: 'option-3', label: 'Option 3' },
  { value: 'option-4', label: 'Option 4' },
];

export const OPERATION_FIELDS: OperationFieldConfig[] = [
  { key: 'opr1', label: 'act 1', options: SHARED_OPTIONS },
  { key: 'opr2', label: 'act 2', options: SHARED_OPTIONS },
  { key: 'opr3', label: 'act 3', options: SHARED_OPTIONS },
  { key: 'opr4', label: 'act 4', options: SHARED_OPTIONS },
  { key: 'opr5', label: 'act 5', options: SHARED_OPTIONS },
  { key: 'opr6', label: 'act 6', options: SHARED_OPTIONS },
  { key: 'opr7', label: 'act 7', options: SHARED_OPTIONS },
  { key: 'opr8', label: 'act 8', options: SHARED_OPTIONS },
  { key: 'opr9', label: 'act 9', options: SHARED_OPTIONS },
  { key: 'opr10', label: 'act 10', options: SHARED_OPTIONS },
];

export const DEFAULT_OPERATIONS_VALUE: OperationsValue = {
  opr1: 'option-1',
  opr2: 'option-1',
  opr3: 'option-1',
  opr4: 'option-1',
  opr5: 'option-1',
  opr6: 'option-1',
  opr7: 'option-1',
  opr8: 'option-1',
  opr9: 'option-1',
  opr10: 'option-1',
};
