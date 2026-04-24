import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { SystemExperimentsApiConfig, SystemExperimentsResponse } from './api-contract';

/**
 * Backend URL configuration (POST endpoints, GET endpoint, WS URL).
 * Provided at module-setup time — no env-file coupling, no hardcoded URLs.
 */
export const SYSTEM_EXPERIMENTS_API_CONFIG = new InjectionToken<SystemExperimentsApiConfig>(
  'SystemExperimentsApiConfig'
);

/**
 * Factory that opens a WebSocket and returns a stream of typed frames.
 * Injected so tests can swap in a fake socket without monkey-patching globals.
 *
 * Default implementation lives in `system-experiments.module.ts` and uses RxJS `webSocket()`.
 */
export type SystemExperimentsWebSocketFactory = (url: string) => Observable<SystemExperimentsResponse>;

export const SYSTEM_EXPERIMENTS_WS_FACTORY = new InjectionToken<SystemExperimentsWebSocketFactory>(
  'SystemExperimentsWebSocketFactory'
);
