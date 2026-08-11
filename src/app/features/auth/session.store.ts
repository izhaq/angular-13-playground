import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map, tap, timeout } from 'rxjs/operators';

import { AUTH_API, LoginRequest, UserSession } from './auth-contract';

/**
 * How long the startup restore may take before the app gives up and starts
 * logged out (10 s). Rationale: APP_INITIALIZER waits on restore(), so an
 * unreachable auth service must not white-screen the app forever; the cost —
 * a valid session on a very slow server bounces to login, where the user can
 * simply log in again — is acceptable for a control station, an infinite
 * blank screen is not.
 *
 * Lives here, next to its only consumer: auth-urls.ts is by charter the
 * route-URL vocabulary, and promoting this to AuthConfig would widen the
 * host-facing surface for an internal resilience knob nobody asked to tune
 * (easy to promote later if a host ever does).
 */
export const SESSION_RESTORE_TIMEOUT_MS = 10_000;

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

  /**
   * Restores the session from the server cookie (app startup / page reload).
   * Unlike login(), errors are swallowed — "no valid session" is a normal
   * startup outcome, not something for a caller to handle. Always completes,
   * so APP_INITIALIZER can safely wait on it.
   *
   * Two resilience rules:
   * - A hanging request is cut off after SESSION_RESTORE_TIMEOUT_MS (see the
   *   constant's doc) — otherwise an unreachable auth service would hold
   *   APP_INITIALIZER, and with it the whole app, on a blank screen forever.
   * - Only a 401 is silent (it just means "not logged in"). Anything else —
   *   server down, 5xx, timeout — is warned to the console: startup must
   *   stay usable, but a dead auth service must not be invisible.
   */
  restore(): Observable<void> {
    return this.api.session().pipe(
      timeout(SESSION_RESTORE_TIMEOUT_MS),
      tap((s) => this._user.set(s)),
      map(() => undefined),
      catchError((error: unknown) => {
        if (!isUnauthorized(error)) {
          console.warn('[auth] Session restore failed — starting logged out.', error);
        }
        return of(undefined);
      }),
    );
  }

  /**
   * Logs out server-side and clears the store — success or not. A dead
   * server must never trap the user logged-in client-side, so the error is
   * swallowed and the observable always emits once and completes; the
   * caller only decides where to navigate afterwards.
   */
  logout(): Observable<void> {
    return this.api.logout().pipe(
      map(() => undefined),
      catchError(() => of(undefined)),
      tap(() => this.clear()),
    );
  }

  clear(): void {
    this._user.set(null);
  }
}

/**
 * "Not logged in" as the server says it — a 401. Checked structurally (any
 * error carrying status 401) rather than via instanceof HttpErrorResponse,
 * so the store keeps zero @angular/common/http coupling and works with any
 * AuthApi implementation.
 */
function isUnauthorized(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { status?: unknown }).status === 401
  );
}
