import { TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of, throwError } from 'rxjs';

import { AUTH_ROUTES_CONFIG, AuthRoutesConfig, UserSession } from '../auth-contract';
import { SessionStore } from '../session.store';
import { LoginPageComponent } from './login-page.component';

describe('LoginPageComponent', () => {
  let store: jasmine.SpyObj<Pick<SessionStore, 'login'>>;
  let router: Router;
  let routeStub: { snapshot: { queryParamMap: ReturnType<typeof convertToParamMap> } };
  let routesConfig: AuthRoutesConfig;

  const session: UserSession = {
    user: { username: 'operation', mode: 'operation', position: 'active' },
    expiresAt: '2026-07-14T12:00:00+00:00',
  };

  beforeEach(async () => {
    store = jasmine.createSpyObj('SessionStore', ['login']);
    routeStub = { snapshot: { queryParamMap: convertToParamMap({}) } };
    routesConfig = { defaultPostLoginUrl: '/system-experiments' };

    await TestBed.configureTestingModule({
      imports: [LoginPageComponent, NoopAnimationsModule, RouterTestingModule],
      providers: [
        { provide: SessionStore, useValue: store },
        { provide: ActivatedRoute, useValue: routeStub },
        { provide: AUTH_ROUTES_CONFIG, useValue: routesConfig },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    spyOn(router, 'navigateByUrl').and.resolveTo(true);
  });

  function createComponent() {
    const fixture = TestBed.createComponent(LoginPageComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('defaults the toggles to operation / active', () => {
    const fixture = createComponent();

    expect(fixture.componentInstance.form.getRawValue().mode).toBe('operation');
    expect(fixture.componentInstance.form.getRawValue().position).toBe('active');
  });

  it('blocks submit and shows messages while required fields are empty', () => {
    const fixture = createComponent();

    // Submit through the DOM (not submit() directly) so the OnPush view
    // re-renders the way it does for a real click.
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    expect(store.login).not.toHaveBeenCalled();
    const errors = fixture.nativeElement.querySelectorAll('.login-card__field-error');
    expect(errors.length).toBe(2);
  });

  it('submits the exact form values and navigates to the default route', () => {
    store.login.and.returnValue(of(session));
    const fixture = createComponent();

    fixture.componentInstance.form.patchValue({
      username: 'operation',
      password: 'operation123!',
      mode: 'operation',
      position: 'active',
    });
    fixture.componentInstance.submit();

    expect(store.login).toHaveBeenCalledOnceWith({
      username: 'operation',
      password: 'operation123!',
      mode: 'operation',
      position: 'active',
    });
    expect(router.navigateByUrl).toHaveBeenCalledOnceWith('/system-experiments');
  });

  it('navigates to the host-configured default post-login url when no returnUrl exists', () => {
    store.login.and.returnValue(of(session));
    routesConfig.defaultPostLoginUrl = '/custom-home';
    const fixture = createComponent();

    fixture.componentInstance.form.patchValue({
      username: 'operation',
      password: 'operation123!',
    });
    fixture.componentInstance.submit();

    expect(router.navigateByUrl).toHaveBeenCalledOnceWith('/custom-home');
  });

  it('navigates to the returnUrl query param when present', () => {
    store.login.and.returnValue(of(session));
    routeStub.snapshot.queryParamMap = convertToParamMap({ returnUrl: '/demo' });
    const fixture = createComponent();

    fixture.componentInstance.form.patchValue({
      username: 'technician',
      password: 'technician123!',
      mode: 'technician',
      position: 'passive',
    });
    fixture.componentInstance.submit();

    expect(router.navigateByUrl).toHaveBeenCalledOnceWith('/demo');
  });

  it('ignores a returnUrl that is not app-relative and falls back to the default route', () => {
    store.login.and.returnValue(of(session));
    routeStub.snapshot.queryParamMap = convertToParamMap({ returnUrl: 'https://evil.example/phish' });
    const fixture = createComponent();

    fixture.componentInstance.form.patchValue({
      username: 'operation',
      password: 'operation123!',
    });
    fixture.componentInstance.submit();

    expect(router.navigateByUrl).toHaveBeenCalledOnceWith('/system-experiments');
  });

  it('ignores a protocol-relative returnUrl and falls back to the default route', () => {
    store.login.and.returnValue(of(session));
    routeStub.snapshot.queryParamMap = convertToParamMap({ returnUrl: '//evil.example/phish' });
    const fixture = createComponent();

    fixture.componentInstance.form.patchValue({
      username: 'operation',
      password: 'operation123!',
    });
    fixture.componentInstance.submit();

    expect(router.navigateByUrl).toHaveBeenCalledOnceWith('/system-experiments');
  });

  it('shows a generic failure message and stays put when login fails', () => {
    store.login.and.returnValue(
      throwError(() => ({ status: 401, error: { error: 'invalid_credentials' } })),
    );
    const fixture = createComponent();

    fixture.componentInstance.form.patchValue({
      username: 'operation',
      password: 'wrong',
    });
    fixture.componentInstance.submit();
    fixture.detectChanges();

    expect(router.navigateByUrl).not.toHaveBeenCalled();
    const error = fixture.nativeElement.querySelector('.login-card__error');
    expect(error?.textContent).toContain('Login failed');
  });
});
