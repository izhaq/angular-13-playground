import { HttpClient } from '@angular/common/http';
import { ApplicationInitStatus } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { Router } from '@angular/router';

import { provideAuth } from './auth.providers';
import { AUTH_ROUTES_CONFIG, AuthConfig, UserSession } from './auth-contract';
import { LOGIN_URL } from './auth-urls';
import { SessionStore } from './session.store';

/**
 * provideAuth() wires an APP_INITIALIZER that restores the session before
 * the app (and so the router) starts — the "page reload" data flow — and,
 * since slice 3, provides the HttpClient with the 401 interceptor attached.
 * TestBed runs APP_INITIALIZERs when the testing module is created, so
 * injecting anything kicks the restore call off.
 */
describe('provideAuth', () => {
  let router: jasmine.SpyObj<Router>;

  const session: UserSession = {
    user: { username: 'operation', mode: 'operation', position: 'active' },
    expiresAt: '2026-07-14T12:00:00+00:00',
  };

  /** Where the user "is" when a later 401 interrupts them. */
  const currentUrl = '/system-experiments';

  function setup(config?: Partial<AuthConfig>): void {
    router = jasmine.createSpyObj<Router>('Router', ['navigate'], { url: currentUrl });
    TestBed.configureTestingModule({
      providers: [
        provideAuth(config),
        // Overrides the backend of the HttpClient that provideAuth provides.
        provideHttpClientTesting(),
        { provide: Router, useValue: router },
      ],
    });
  }

  /** Answer the initializer's GET /session so verify() stays satisfied. */
  function flushRestoreAs401(): void {
    TestBed.inject(HttpTestingController)
      .expectOne('/api/auth/session')
      .flush(null, { status: 401, statusText: 'Unauthorized' });
  }

  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
  });

  it('restores the session at startup and holds app init until the response', async () => {
    setup();
    const httpMock = TestBed.inject(HttpTestingController);
    const store = TestBed.inject(SessionStore);
    const initStatus = TestBed.inject(ApplicationInitStatus);
    let initDone = false;
    initStatus.donePromise.then(() => (initDone = true));

    const req = httpMock.expectOne('/api/auth/session');
    expect(req.request.method).toBe('GET');
    expect(req.request.withCredentials).toBeTrue();

    // The response is still pending — initialization must wait for it.
    await Promise.resolve();
    expect(initDone).toBeFalse();
    expect(store.isLoggedIn()).toBeFalse();

    req.flush(session);
    await initStatus.donePromise;

    expect(store.session()).toEqual(session);
    expect(store.isLoggedIn()).toBeTrue();
  });

  it('resolves silently and stays logged out when the restore gets a 401', async () => {
    setup();
    const consoleError = spyOn(console, 'error');
    const httpMock = TestBed.inject(HttpTestingController);
    const store = TestBed.inject(SessionStore);
    const initStatus = TestBed.inject(ApplicationInitStatus);

    httpMock
      .expectOne('/api/auth/session')
      .flush(null, { status: 401, statusText: 'Unauthorized' });
    await initStatus.donePromise;

    expect(store.session()).toBeNull();
    expect(store.isLoggedIn()).toBeFalse();
    expect(consoleError).not.toHaveBeenCalled();
    // The interceptor must not treat the startup restore's own 401 as
    // "session gone" — a normal logged-out startup stays on its route.
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('registers the 401 interceptor on the http client it provides', () => {
    setup();
    const httpMock = TestBed.inject(HttpTestingController);
    const store = TestBed.inject(SessionStore);

    // Startup restore succeeds → logged in.
    httpMock.expectOne('/api/auth/session').flush(session);
    expect(store.isLoggedIn()).toBeTrue();

    // A later 401 from any other endpoint = expiry / take-over.
    TestBed.inject(HttpClient).get('/api/experiments').subscribe({ error: () => {} });
    httpMock.expectOne('/api/experiments').flush(null, { status: 401, statusText: 'Unauthorized' });

    expect(store.isLoggedIn()).toBeFalse();
    // Expiry mid-work: the redirect carries the interrupted page so login
    // can bring the user back (same shape the guard produces).
    expect(router.navigate).toHaveBeenCalledOnceWith([LOGIN_URL], {
      queryParams: { returnUrl: currentUrl },
    });
  });

  it('wires a host-configured defaultPostLoginUrl into AUTH_ROUTES_CONFIG', () => {
    setup({ defaultPostLoginUrl: '/ops-home' });

    expect(TestBed.inject(AUTH_ROUTES_CONFIG).defaultPostLoginUrl).toBe('/ops-home');
    flushRestoreAs401();
  });

  it('defaults the post-login url to the playground home when not configured', () => {
    setup();

    expect(TestBed.inject(AUTH_ROUTES_CONFIG).defaultPostLoginUrl).toBe('/system-experiments');
    flushRestoreAs401();
  });
});
