import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { AUTH_API_CONFIG, AuthApi, LoginRequest, UserSession } from './auth-contract';

/**
 * Real HTTP implementation of the auth contract. Stateless.
 *
 * Endpoint URLs come from AUTH_API_CONFIG (defaults: relative `/api/auth/*`
 * paths — the dev proxy or the production reverse proxy resolves the host;
 * a host app overrides them via `provideAuth({...})`). `withCredentials:
 * true` on every call so the sid cookie also travels on the cross-origin
 * deployment path (harmless on same-origin calls).
 */
@Injectable({ providedIn: 'root' })
export class AuthApiService implements AuthApi {
  private readonly http = inject(HttpClient);
  private readonly config = inject(AUTH_API_CONFIG);

  login(req: LoginRequest): Observable<UserSession> {
    return this.http.post<UserSession>(this.config.loginUrl, req, { withCredentials: true });
  }

  logout(): Observable<void> {
    return this.http.post<void>(this.config.logoutUrl, null, { withCredentials: true });
  }

  session(): Observable<UserSession> {
    return this.http.get<UserSession>(this.config.sessionUrl, { withCredentials: true });
  }
}
