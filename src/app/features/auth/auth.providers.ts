import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { APP_INITIALIZER, EnvironmentProviders, Provider, inject } from '@angular/core';

import { AuthApiService } from './auth-api.service';
import {
  AUTH_API,
  AUTH_API_CONFIG,
  AUTH_ROUTES_CONFIG,
  AuthConfig,
  DEFAULT_AUTH_API_CONFIG,
  DEFAULT_AUTH_ROUTES_CONFIG,
} from './auth-contract';
import { SessionStore } from './session.store';
import { unauthorizedInterceptor } from './unauthorized.interceptor';

/**
 * The host wiring seam — one call in the root providers plugs the auth
 * feature in.
 *
 * Endpoint URLs default to the contract's `/api/auth/*` paths and the
 * post-login route to the playground home (auth-urls.ts); a host app
 * overrides any of them via the optional `config` argument.
 *
 * Also wires the startup session restore (page-reload flow): the
 * APP_INITIALIZER resolves only after GET /api/auth/session answers, so
 * routing — and with it authGuard — never runs against an unrestored store.
 * A 401 is a normal "not logged in" outcome; restore() swallows it, so
 * startup stays silent.
 *
 * Also provides the app's HttpClient with the 401 interceptor attached
 * (replacing HttpClientModule in the host) — the expiry / take-over flow:
 * any 401 from any API call clears the store and redirects to login.
 *
 * A later slice adds the real/mock switch driven by runtime config.
 */
export function provideAuth(
  config: Partial<AuthConfig> = {},
): (Provider | EnvironmentProviders)[] {
  const { defaultPostLoginUrl, ...apiConfig } = config;
  return [
    provideHttpClient(withInterceptors([unauthorizedInterceptor])),
    { provide: AUTH_API, useExisting: AuthApiService },
    { provide: AUTH_API_CONFIG, useValue: { ...DEFAULT_AUTH_API_CONFIG, ...apiConfig } },
    {
      provide: AUTH_ROUTES_CONFIG,
      useValue: {
        ...DEFAULT_AUTH_ROUTES_CONFIG,
        ...(defaultPostLoginUrl !== undefined && { defaultPostLoginUrl }),
      },
    },
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
