import { TestBed } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';

import { AuthApiService } from './auth-api.service';
import { LoginRequest, UserSession } from './auth-contract';

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
