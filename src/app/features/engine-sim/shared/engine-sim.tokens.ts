import { InjectionToken } from '@angular/core';
import { EngineSimApiConfig } from './engine-sim.api-contract';

export const ENGINE_SIM_API_CONFIG = new InjectionToken<EngineSimApiConfig>(
  'EngineSimApiConfig'
);
