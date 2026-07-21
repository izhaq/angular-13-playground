import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';

import { AUTH_API_CONFIG } from './auth-contract';
import { LOGIN_URL } from './auth-urls';
import { SessionStore } from './session.store';

/**
 * The expiry / take-over data flow: any 401 from any API call means "session
 * gone" → clear the store and go to the login page. The error still reaches
 * the caller untouched — this interceptor observes, it never swallows.
 *
 * Exception: 401s from the auth feature's own endpoints, where a 401 already
 * has a different, owned meaning:
 *
 * - sessionUrl — "not logged in" during the startup restore; restore()
 *   swallows it, and redirecting here would hijack every normal logged-out
 *   startup.
 * - loginUrl — "invalid_credentials"; the login page renders it inline, and
 *   redirecting would strip the returnUrl the user still needs.
 *
 * The exempt URLs come from AUTH_API_CONFIG — the token the http service
 * already reads — so a host override keeps interceptor and service in step
 * with zero extra configuration surface.
 */
export const unauthorizedInterceptor: HttpInterceptorFn = (req, next) => {
  const { loginUrl, sessionUrl } = inject(AUTH_API_CONFIG);
  const store = inject(SessionStore);
  const router = inject(Router);

  return next(req).pipe(
    tap({
      error: (error) => {
        if (
          error instanceof HttpErrorResponse &&
          error.status === 401 &&
          req.url !== loginUrl &&
          req.url !== sessionUrl
        ) {
          store.clear();
          router.navigateByUrl(LOGIN_URL);
        }
      },
    }),
  );
};
