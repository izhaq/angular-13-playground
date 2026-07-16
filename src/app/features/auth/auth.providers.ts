import { Provider } from '@angular/core';

import { AuthApiService } from './auth-api.service';
import { AUTH_API, AUTH_API_CONFIG, AuthApiConfig, DEFAULT_AUTH_API_CONFIG } from './auth-contract';

/**
 * The host wiring seam — one call in the root providers plugs the auth
 * feature in. Endpoint URLs default to the contract's `/api/auth/*` paths;
 * a host app overrides any of them via the optional `config` argument.
 * Slice 1 wires the real HTTP api only; later slices add the 401
 * interceptor, APP_INITIALIZER session restore, and the real/mock switch
 * driven by runtime config.
 */
export function provideAuth(config?: Partial<AuthApiConfig>): Provider[] {
  return [
    { provide: AUTH_API, useExisting: AuthApiService },
    { provide: AUTH_API_CONFIG, useValue: { ...DEFAULT_AUTH_API_CONFIG, ...config } },
  ];
}
