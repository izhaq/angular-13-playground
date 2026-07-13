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

  it('clear() empties the session', () => {
    store.login(request).subscribe();
    apiLogin$.next(session);
    apiLogin$.complete();

    store.clear();

    expect(store.session()).toBeNull();
    expect(store.isLoggedIn()).toBeFalse();
  });
});
