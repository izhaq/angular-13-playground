import { InjectionToken } from '@angular/core';

export interface TabStateConfig<T> {
  defaultState: T;
  apiUrl: string;
}

export const TAB_STATE_CONFIG = new InjectionToken<TabStateConfig<unknown>>('TabStateConfig');
