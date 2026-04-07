import { EventEmitter, InjectionToken } from '@angular/core';

export interface DropdownOption {
  value: string;
  label: string;
}

export interface DropdownHost<T = unknown> {
  value: T;
  disabled: boolean;
  changed: EventEmitter<T>;
}

export const DROPDOWN_HOST = new InjectionToken<DropdownHost>('DropdownHost');
