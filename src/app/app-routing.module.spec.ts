import { authGuard } from './features/auth/auth.guard';
import { LOGIN_PATH } from './features/auth/auth-urls';
import { buildRoutes } from './app-routing.module';

describe('buildRoutes', () => {
  const dashboard = (authEnabled: boolean) =>
    buildRoutes(authEnabled).find((r) => r.path === 'system-experiments');
  const hasLogin = (authEnabled: boolean) =>
    buildRoutes(authEnabled).some((r) => r.path === LOGIN_PATH);

  it('with auth off: no login route and no guard on the dashboard', () => {
    expect(hasLogin(false)).toBeFalse();
    expect(dashboard(false)?.canActivate).toEqual([]);
  });

  it('with auth on: the login route exists and the dashboard is guarded', () => {
    expect(hasLogin(true)).toBeTrue();
    expect(dashboard(true)?.canActivate).toEqual([authGuard]);
  });

  it('keeps the same non-auth routes either way', () => {
    const paths = (authEnabled: boolean) =>
      buildRoutes(authEnabled).map((r) => r.path).filter((p) => p !== LOGIN_PATH);
    expect(paths(false)).toEqual(paths(true));
  });
});
