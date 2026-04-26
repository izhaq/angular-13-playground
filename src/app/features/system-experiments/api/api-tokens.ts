import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { SystemExperimentsApiConfig, SystemExperimentsResponse } from './api-contract';

/**
 * Backend URL configuration. Provided at module-setup time — no env-file
 * coupling, no hardcoded URLs. The host project wires its own routes.
 */
export const SYSTEM_EXPERIMENTS_API_CONFIG = new InjectionToken<SystemExperimentsApiConfig>(
  'SystemExperimentsApiConfig'
);

/**
 * Factory that opens a WebSocket and returns a stream of typed frames.
 * Injected so tests can swap in a fake socket without monkey-patching globals.
 */
export type SystemExperimentsWebSocketFactory = (url: string) => Observable<SystemExperimentsResponse>;

export const SYSTEM_EXPERIMENTS_WS_FACTORY = new InjectionToken<SystemExperimentsWebSocketFactory>(
  'SystemExperimentsWebSocketFactory'
);
