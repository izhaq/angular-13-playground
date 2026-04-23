import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { EngineSimApiConfig, EngineSimResponse } from './api-contract';

/**
 * Backend URL configuration (POST endpoints, GET endpoint, WS URL).
 * Provided at module-setup time — no env-file coupling, no hardcoded URLs.
 */
export const ENGINE_SIM_API_CONFIG = new InjectionToken<EngineSimApiConfig>(
  'EngineSimApiConfig'
);

/**
 * Factory that opens a WebSocket and returns a stream of typed frames.
 * Injected so tests can swap in a fake socket without monkey-patching globals.
 *
 * Default implementation lives in `engine-sim.module.ts` and uses RxJS `webSocket()`.
 */
export type EngineSimWebSocketFactory = (url: string) => Observable<EngineSimResponse>;

export const ENGINE_SIM_WS_FACTORY = new InjectionToken<EngineSimWebSocketFactory>(
  'EngineSimWebSocketFactory'
);
