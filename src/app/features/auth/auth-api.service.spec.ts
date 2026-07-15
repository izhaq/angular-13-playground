import { Provider } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';

import { AuthApiService } from './auth-api.service';
import { AUTH_API, AuthApi, LoginRequest, UserSession } from './auth-contract';
import { provideAuth } from './auth.providers';

describe('AuthApiService', () => {
  let service: AuthApiService;
  let httpMock: HttpTestingController;

  const session: UserSession = {
    user: { username: 'operation', mode: 'operation', position: 'active' },
    expiresAt: '2026-07-14T12:00:00+00:00',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    service = TestBed.inject(AuthApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('POSTs the exact contract body to /api/auth/login with credentials', () => {
    const req: LoginRequest = {
      username: 'operation',
      password: 'operation123!',
      mode: 'operation',
      position: 'active',
    };
    let result: UserSession | undefined;

    service.login(req).subscribe((s) => (result = s));

    const http = httpMock.expectOne('/api/auth/login');
    expect(http.request.method).toBe('POST');
    expect(http.request.body).toEqual(req);
    expect(http.request.withCredentials).toBeTrue();
    http.flush(session);
    expect(result).toEqual(session);
  });

  it('POSTs to /api/auth/logout with credentials', () => {
    let completed = false;

    service.logout().subscribe({ complete: () => (completed = true) });

    const http = httpMock.expectOne('/api/auth/logout');
    expect(http.request.method).toBe('POST');
    expect(http.request.withCredentials).toBeTrue();
    http.flush(null, { status: 204, statusText: 'No Content' });
    expect(completed).toBeTrue();
  });

  it('GETs /api/auth/session with credentials', () => {
    let result: UserSession | undefined;

    service.session().subscribe((s) => (result = s));

    const http = httpMock.expectOne('/api/auth/session');
    expect(http.request.method).toBe('GET');
    expect(http.request.withCredentials).toBeTrue();
    http.flush(session);
    expect(result).toEqual(session);
  });
});

describe('AuthApiService endpoint configuration', () => {
  const loginReq: LoginRequest = {
    username: 'operation',
    password: 'operation123!',
    mode: 'operation',
    position: 'active',
  };

  /**
   * provideAuth() also wires the APP_INITIALIZER session restore, which
   * TestBed runs at module init — so a startup GET to the *configured*
   * session URL is already in flight before each test body. Draining it
   * here (as the normal logged-out 401) both keeps the mock clean and
   * proves the restore call honors the configured URL.
   */
  function setup(
    providers: Provider[],
    startupSessionUrl: string,
  ): { api: AuthApi; httpMock: HttpTestingController } {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers,
    });
    const httpMock = TestBed.inject(HttpTestingController);
    httpMock
      .expectOne(startupSessionUrl)
      .flush(null, { status: 401, statusText: 'Unauthorized' });
    return {
      api: TestBed.inject(AUTH_API),
      httpMock,
    };
  }

  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('uses the default /api/auth/* URLs with zero-arg provideAuth()', () => {
    const { api, httpMock } = setup(provideAuth(), '/api/auth/session');

    api.login(loginReq).subscribe();
    api.logout().subscribe();
    api.session().subscribe();

    expect(httpMock.expectOne('/api/auth/login').request.method).toBe('POST');
    expect(httpMock.expectOne('/api/auth/logout').request.method).toBe('POST');
    expect(httpMock.expectOne('/api/auth/session').request.method).toBe('GET');
  });

  it('sends requests to the URLs given in provideAuth(config)', () => {
    const { api, httpMock } = setup(
      provideAuth({
        loginUrl: '/host/auth/sign-in',
        logoutUrl: '/host/auth/sign-out',
        sessionUrl: '/host/auth/whoami',
      }),
      '/host/auth/whoami',
    );

    api.login(loginReq).subscribe();
    api.logout().subscribe();
    api.session().subscribe();

    expect(httpMock.expectOne('/host/auth/sign-in').request.method).toBe('POST');
    expect(httpMock.expectOne('/host/auth/sign-out').request.method).toBe('POST');
    expect(httpMock.expectOne('/host/auth/whoami').request.method).toBe('GET');
  });

  it('keeps the remaining defaults when only some URLs are overridden', () => {
    const { api, httpMock } = setup(
      provideAuth({ loginUrl: '/host/auth/sign-in' }),
      '/api/auth/session',
    );

    api.login(loginReq).subscribe();
    api.session().subscribe();

    httpMock.expectOne('/host/auth/sign-in');
    httpMock.expectOne('/api/auth/session');
  });
});
