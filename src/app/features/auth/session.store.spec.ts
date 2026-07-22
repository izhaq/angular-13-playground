import { HttpErrorResponse } from '@angular/common/http';
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NEVER, Subject } from 'rxjs';

import { AUTH_API, AuthApi, LoginRequest, UserSession } from './auth-contract';
import { SESSION_RESTORE_TIMEOUT_MS, SessionStore } from './session.store';

describe('SessionStore', () => {
  let api: jasmine.SpyObj<AuthApi>;
  let apiLogin$: Subject<UserSession>;
  let store: SessionStore;

  const request: LoginRequest = {
    username: 'operation',
    password: 'operation123!',
    mode: 'operation',
    position: 'active',
  };

  const session: UserSession = {
    user: { username: 'operation', mode: 'operation', position: 'active' },
    expiresAt: '2026-07-14T12:00:00+00:00',
  };

  beforeEach(() => {
    apiLogin$ = new Subject<UserSession>();
    api = jasmine.createSpyObj<AuthApi>('AuthApi', ['login', 'logout', 'session']);
    api.login.and.returnValue(apiLogin$.asObservable());

    TestBed.configureTestingModule({
      providers: [{ provide: AUTH_API, useValue: api }],
    });
    store = TestBed.inject(SessionStore);
  });

  it('starts logged out', () => {
    expect(store.session()).toBeNull();
    expect(store.isLoggedIn()).toBeFalse();
  });

  it('passes the login request to the api unchanged', () => {
    store.login(request).subscribe();

    expect(api.login).toHaveBeenCalledOnceWith(request);
  });

  it('sets the session and flips isLoggedIn on login success', () => {
    store.login(request).subscribe();

    apiLogin$.next(session);
    apiLogin$.complete();

    expect(store.session()).toEqual(session);
    expect(store.isLoggedIn()).toBeTrue();
  });

  it('propagates the login error and stays logged out on failure', () => {
    const failure = { status: 401, error: { error: 'invalid_credentials' } };
    let received: unknown;

    store.login(request).subscribe({ error: (e) => (received = e) });
    apiLogin$.error(failure);

    expect(received).toBe(failure);
    expect(store.session()).toBeNull();
    expect(store.isLoggedIn()).toBeFalse();
  });

  it('restore() fills the session from the api and completes', () => {
    const session$ = new Subject<UserSession>();
    api.session.and.returnValue(session$.asObservable());
    let completed = false;

    store.restore().subscribe({ complete: () => (completed = true) });
    session$.next(session);
    session$.complete();

    expect(store.session()).toEqual(session);
    expect(store.isLoggedIn()).toBeTrue();
    expect(completed).toBeTrue();
  });

  it('restore() swallows the error and stays logged out when there is no valid session', () => {
    const session$ = new Subject<UserSession>();
    api.session.and.returnValue(session$.asObservable());
    let completed = false;
    let errored = false;

    store.restore().subscribe({
      complete: () => (completed = true),
      error: () => (errored = true),
    });
    session$.error({ status: 401 });

    expect(errored).toBeFalse();
    expect(completed).toBeTrue();
    expect(store.session()).toBeNull();
    expect(store.isLoggedIn()).toBeFalse();
  });

  it('restore() warns on a non-401 failure so a dead server at startup is not invisible', () => {
    const warn = spyOn(console, 'warn');
    const session$ = new Subject<UserSession>();
    api.session.and.returnValue(session$.asObservable());
    let completed = false;

    store.restore().subscribe({ complete: () => (completed = true) });
    session$.error(new HttpErrorResponse({ status: 500, statusText: 'Internal Server Error' }));

    expect(warn).toHaveBeenCalledTimes(1);
    expect(completed).toBeTrue();
    expect(store.isLoggedIn()).toBeFalse();
  });

  it('restore() does not warn on a 401 — a logged-out startup is a normal outcome', () => {
    const warn = spyOn(console, 'warn');
    const session$ = new Subject<UserSession>();
    api.session.and.returnValue(session$.asObservable());

    store.restore().subscribe();
    session$.error(new HttpErrorResponse({ status: 401, statusText: 'Unauthorized' }));

    expect(warn).not.toHaveBeenCalled();
    expect(store.isLoggedIn()).toBeFalse();
  });

  it('restore() gives up after the timeout, warns, and resolves logged out', fakeAsync(() => {
    // An unreachable auth service must not white-screen the app forever:
    // APP_INITIALIZER waits on restore(), so a hanging request would hang
    // the whole app.
    const warn = spyOn(console, 'warn');
    api.session.and.returnValue(NEVER);
    let completed = false;
    let errored = false;

    store.restore().subscribe({
      complete: () => (completed = true),
      error: () => (errored = true),
    });

    tick(SESSION_RESTORE_TIMEOUT_MS - 1);
    expect(completed).toBeFalse();

    tick(1);
    expect(completed).toBeTrue();
    expect(errored).toBeFalse();
    expect(store.isLoggedIn()).toBeFalse();
    expect(warn).toHaveBeenCalledTimes(1);
  }));

  it('logout() calls the api, clears the session, and completes', () => {
    store.login(request).subscribe();
    apiLogin$.next(session);
    apiLogin$.complete();
    const logout$ = new Subject<void>();
    api.logout.and.returnValue(logout$.asObservable());
    let completed = false;

    store.logout().subscribe({ complete: () => (completed = true) });
    expect(api.logout).toHaveBeenCalledTimes(1);
    logout$.next(undefined);
    logout$.complete();

    expect(store.session()).toBeNull();
    expect(store.isLoggedIn()).toBeFalse();
    expect(completed).toBeTrue();
  });

  it('logout() clears the session even when the server call fails', () => {
    // A dead server must not trap the user logged-in client-side.
    store.login(request).subscribe();
    apiLogin$.next(session);
    apiLogin$.complete();
    const logout$ = new Subject<void>();
    api.logout.and.returnValue(logout$.asObservable());
    let completed = false;
    let errored = false;

    store.logout().subscribe({
      complete: () => (completed = true),
      error: () => (errored = true),
    });
    logout$.error(new Error('server unreachable'));

    expect(errored).toBeFalse();
    expect(completed).toBeTrue();
    expect(store.session()).toBeNull();
    expect(store.isLoggedIn()).toBeFalse();
  });

  it('clear() empties the session', () => {
    store.login(request).subscribe();
    apiLogin$.next(session);
    apiLogin$.complete();

    store.clear();

    expect(store.session()).toBeNull();
    expect(store.isLoggedIn()).toBeFalse();
  });
});
