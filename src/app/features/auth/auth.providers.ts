import { APP_INITIALIZER, Provider, inject } from '@angular/core';

import { AuthApiService } from './auth-api.service';
import { AUTH_API, AUTH_API_CONFIG, AuthApiConfig, DEFAULT_AUTH_API_CONFIG } from './auth-contract';
import { SessionStore } from './session.store';

/**
 * The host wiring seam — one call in the root providers plugs the auth
 * feature in.
 *
 * Endpoint URLs default to the contract's `/api/auth/*` paths; a host app
 * overrides any of them via the optional `config` argument.
 *
 * Also wires the startup session restore (page-reload flow): the
 * APP_INITIALIZER resolves only after GET /api/auth/session answers, so
 * routing — and with it authGuard — never runs against an unrestored store.
 * A 401 is a normal "not logged in" outcome; restore() swallows it, so
 * startup stays silent.
 *
 * Later slices add the 401 interceptor and the real/mock switch driven by
 * runtime config.
 */
export function provideAuth(config?: Partial<AuthApiConfig>): Provider[] {
  return [
    { provide: AUTH_API, useExisting: AuthApiService },
    { provide: AUTH_API_CONFIG, useValue: { ...DEFAULT_AUTH_API_CONFIG, ...config } },
    {
      provide: APP_INITIALIZER,
      multi: true,
      useFactory: () => {
        const store = inject(SessionStore);
        return () => store.restore();
      },
    },
  ];
}
