import { ApplicationInitStatus } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';

import { provideAuth } from './auth.providers';
import { UserSession } from './auth-contract';
import { SessionStore } from './session.store';

/**
 * provideAuth() wires an APP_INITIALIZER that restores the session before
 * the app (and so the router) starts — the "page reload" data flow. TestBed
 * runs APP_INITIALIZERs when the testing module is created, so injecting
 * anything kicks the restore call off.
 */
describe('provideAuth', () => {
  const session: UserSession = {
    user: { username: 'operation', mode: 'operation', position: 'active' },
    expiresAt: '2026-07-14T12:00:00+00:00',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [provideAuth()],
    });
  });

  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
  });

  it('restores the session at startup and holds app init until the response', async () => {
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
  });
});
