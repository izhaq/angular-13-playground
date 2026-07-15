import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { SessionStore } from './session.store';

/**
 * Blocks a route unless the store holds a session; otherwise redirects to
 * /login, carrying the attempted URL so login can return there. state.url is
 * always app-relative (router-produced, leading '/'), so the returnUrl this
 * guard emits always passes the login page's allowlist.
 */
export const authGuard: CanActivateFn = (_route, state) => {
  const store = inject(SessionStore);
  return store.isLoggedIn()
    ? true
    : inject(Router).createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};
