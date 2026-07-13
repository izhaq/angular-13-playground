import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { AuthApi, LoginRequest, UserSession } from './auth-contract';

/**
 * Real HTTP implementation of the auth contract. Stateless.
 *
 * URLs are relative — the contract fixes the paths, and the dev proxy or the
 * production reverse proxy resolves the host. `withCredentials: true` on
 * every call so the sid cookie also travels on the cross-origin deployment
 * path (harmless on same-origin calls).
 */
@Injectable({ providedIn: 'root' })
export class AuthApiService implements AuthApi {
  private readonly http = inject(HttpClient);

  login(req: LoginRequest): Observable<UserSession> {
    return this.http.post<UserSession>('/api/auth/login', req, { withCredentials: true });
  }

  logout(): Observable<void> {
    return this.http.post<void>('/api/auth/logout', null, { withCredentials: true });
  }

  session(): Observable<UserSession> {
    return this.http.get<UserSession>('/api/auth/session', { withCredentials: true });
  }
}
