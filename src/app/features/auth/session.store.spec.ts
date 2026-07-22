import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';

import { AUTH_API, AuthApi, LoginRequest, UserSession } from './auth-contract';
import { SessionStore } from './session.store';

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
