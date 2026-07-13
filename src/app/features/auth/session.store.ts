import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

import { AUTH_API, LoginRequest, UserSession } from './auth-contract';

/** Session state. The only thing the rest of the app reads. */
@Injectable({ providedIn: 'root' })
export class SessionStore {
  private readonly api = inject(AUTH_API);

  private readonly _user = signal<UserSession | null>(null);

  readonly session = this._user.asReadonly();
  readonly isLoggedIn = computed(() => this._user() !== null);

  /**
   * Logs in and fills the store on success. Errors pass through untouched
   * (the store stays logged out) so the caller decides how to present them.
   */
  login(req: LoginRequest): Observable<UserSession> {
    return this.api.login(req).pipe(tap((s) => this._user.set(s)));
  }

  clear(): void {
    this._user.set(null);
  }
}
