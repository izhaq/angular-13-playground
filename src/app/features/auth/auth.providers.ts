import { Provider } from '@angular/core';

import { AuthApiService } from './auth-api.service';
import { AUTH_API } from './auth-contract';

/**
 * The host wiring seam — one call in the root providers plugs the auth
 * feature in. Slice 1 wires the real HTTP api only; later slices add the
 * 401 interceptor, APP_INITIALIZER session restore, and the real/mock
 * switch driven by runtime config.
 */
export function provideAuth(): Provider[] {
  return [{ provide: AUTH_API, useExisting: AuthApiService }];
}
