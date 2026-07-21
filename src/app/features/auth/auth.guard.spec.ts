import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';

import { authGuard } from './auth.guard';
import { AUTH_API, AuthApi, UserSession } from './auth-contract';
import { SessionStore } from './session.store';

describe('authGuard', () => {
  let api: jasmine.SpyObj<AuthApi>;
  let store: SessionStore;

  const session: UserSession = {
    user: { username: 'operation', mode: 'operation', position: 'active' },
    expiresAt: '2026-07-14T12:00:00+00:00',
  };

  beforeEach(() => {
    api = jasmine.createSpyObj<AuthApi>('AuthApi', ['login', 'logout', 'session']);

    TestBed.configureTestingModule({
      imports: [RouterTestingModule],
      providers: [{ provide: AUTH_API, useValue: api }],
    });
    store = TestBed.inject(SessionStore);
  });

  function runGuard(url: string): boolean | UrlTree {
    return TestBed.runInInjectionContext(() =>
      authGuard({} as ActivatedRouteSnapshot, { url } as RouterStateSnapshot),
    ) as boolean | UrlTree;
  }

  function logIn(): void {
    api.login.and.returnValue(of(session));
    store
      .login({ username: 'operation', password: 'operation123!', mode: 'operation', position: 'active' })
      .subscribe();
  }

  it('passes when the store holds a session', () => {
    logIn();

    expect(runGuard('/system-experiments')).toBeTrue();
  });

  it('redirects to /login with the attempted url as returnUrl when logged out', () => {
    const result = runGuard('/system-experiments');

    expect(result).toBeInstanceOf(UrlTree);
    const tree = result as UrlTree;
    expect(tree.root.children['primary'].segments.map((s) => s.path)).toEqual(['login']);
    expect(tree.queryParams['returnUrl']).toBe('/system-experiments');
  });

  it('only ever produces app-relative returnUrls (leading slash), deep links included', () => {
    const result = runGuard('/system-experiments/deep?tab=2') as UrlTree;

    const returnUrl = result.queryParams['returnUrl'];
    expect(returnUrl.startsWith('/')).toBeTrue();
    expect(returnUrl).toBe('/system-experiments/deep?tab=2');
  });
});
