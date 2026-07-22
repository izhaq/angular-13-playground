import {
  HttpClient,
  HttpErrorResponse,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';

import {
  AUTH_API,
  AUTH_API_CONFIG,
  AuthApi,
  AuthApiConfig,
  DEFAULT_AUTH_API_CONFIG,
  UserSession,
} from './auth-contract';
import { LOGIN_URL } from './auth-urls';
import { SessionStore } from './session.store';
import { unauthorizedInterceptor } from './unauthorized.interceptor';

/**
 * The expiry / take-over data flow: any 401 means "session gone" → clear the
 * store, go to login. The exceptions are the auth endpoints whose 401 has its
 * own defined meaning and owner — sessionUrl ("not logged in" at startup,
 * swallowed by restore()) and loginUrl ("invalid_credentials", rendered by
 * the login page) — identified through AUTH_API_CONFIG, never hardcoded.
 */
describe('unauthorizedInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let store: SessionStore;
  let api: jasmine.SpyObj<AuthApi>;
  let router: jasmine.SpyObj<Router>;

  const session: UserSession = {
    user: { username: 'operation', mode: 'operation', position: 'active' },
    expiresAt: '2026-07-22T12:00:00+00:00',
  };

  function setup(config: AuthApiConfig = DEFAULT_AUTH_API_CONFIG): void {
    api = jasmine.createSpyObj<AuthApi>('AuthApi', ['login', 'logout', 'session']);
    router = jasmine.createSpyObj<Router>('Router', ['navigateByUrl']);

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([unauthorizedInterceptor])),
        provideHttpClientTesting(),
        { provide: AUTH_API, useValue: api },
        { provide: AUTH_API_CONFIG, useValue: config },
        { provide: Router, useValue: router },
      ],
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    store = TestBed.inject(SessionStore);
  }

  /** Fills the store so "cleared" is observable. */
  function logIn(): void {
    api.login.and.returnValue(of(session));
    store
      .login({ username: 'operation', password: 'operation123!', mode: 'operation', position: 'active' })
      .subscribe();
    expect(store.isLoggedIn()).toBeTrue();
  }

  afterEach(() => {
    httpMock.verify();
  });

  it('clears the store and navigates to the login page on a 401 from any API call', () => {
    setup();
    logIn();

    http.get('/api/experiments').subscribe({ error: () => {} });
    httpMock.expectOne('/api/experiments').flush(null, { status: 401, statusText: 'Unauthorized' });

    expect(store.isLoggedIn()).toBeFalse();
    expect(router.navigateByUrl).toHaveBeenCalledOnceWith(LOGIN_URL);
  });

  it('still lets the 401 propagate to the caller', () => {
    setup();
    let received: HttpErrorResponse | undefined;

    http.get('/api/experiments').subscribe({ error: (e) => (received = e) });
    httpMock.expectOne('/api/experiments').flush(null, { status: 401, statusText: 'Unauthorized' });

    expect(received?.status).toBe(401);
  });

  it('does not clear or navigate on a 401 from the session endpoint (normal logged-out startup)', () => {
    setup();
    logIn();

    http.get(DEFAULT_AUTH_API_CONFIG.sessionUrl).subscribe({ error: () => {} });
    httpMock
      .expectOne(DEFAULT_AUTH_API_CONFIG.sessionUrl)
      .flush(null, { status: 401, statusText: 'Unauthorized' });

    expect(store.isLoggedIn()).toBeTrue();
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });

  it('does not navigate on a 401 from the login endpoint (invalid credentials belong to the login page)', () => {
    setup();

    http.post(DEFAULT_AUTH_API_CONFIG.loginUrl, {}).subscribe({ error: () => {} });
    httpMock
      .expectOne(DEFAULT_AUTH_API_CONFIG.loginUrl)
      .flush({ error: 'invalid_credentials' }, { status: 401, statusText: 'Unauthorized' });

    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });

  it('passes non-401 errors through untouched', () => {
    setup();
    logIn();
    let received: HttpErrorResponse | undefined;

    http.get('/api/experiments').subscribe({ error: (e) => (received = e) });
    httpMock
      .expectOne('/api/experiments')
      .flush(null, { status: 500, statusText: 'Internal Server Error' });

    expect(received?.status).toBe(500);
    expect(store.isLoggedIn()).toBeTrue();
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });

  it('leaves successful responses alone', () => {
    setup();
    logIn();
    let received: unknown;

    http.get('/api/experiments').subscribe((body) => (received = body));
    httpMock.expectOne('/api/experiments').flush({ ok: true });

    expect(received).toEqual({ ok: true });
    expect(store.isLoggedIn()).toBeTrue();
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });

  it('follows host-overridden endpoint urls from AUTH_API_CONFIG', () => {
    setup({ loginUrl: '/auth2/login', logoutUrl: '/auth2/logout', sessionUrl: '/auth2/session' });
    logIn();

    // The overridden session endpoint is exempt…
    http.get('/auth2/session').subscribe({ error: () => {} });
    httpMock.expectOne('/auth2/session').flush(null, { status: 401, statusText: 'Unauthorized' });
    expect(store.isLoggedIn()).toBeTrue();
    expect(router.navigateByUrl).not.toHaveBeenCalled();

    // …while the default path — no longer the configured one — is not.
    http.get(DEFAULT_AUTH_API_CONFIG.sessionUrl).subscribe({ error: () => {} });
    httpMock
      .expectOne(DEFAULT_AUTH_API_CONFIG.sessionUrl)
      .flush(null, { status: 401, statusText: 'Unauthorized' });
    expect(store.isLoggedIn()).toBeFalse();
    expect(router.navigateByUrl).toHaveBeenCalledOnceWith(LOGIN_URL);
  });
});
