import { HttpErrorResponse } from '@angular/common/http';
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { Subject, of, throwError } from 'rxjs';

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

  describe('error states', () => {
    function submitFailingWith(error: unknown) {
      store.login.and.returnValue(throwError(() => error));
      const fixture = createComponent();
      fixture.componentInstance.form.patchValue({ username: 'operation', password: 'wrong' });
      fixture.componentInstance.submit();
      fixture.detectChanges();
      return fixture;
    }

    function errorText(fixture: { nativeElement: HTMLElement }): string {
      return fixture.nativeElement.querySelector('.login-card__error')?.textContent ?? '';
    }

    it('renders the wrong-credentials message on a 401 and stays put', () => {
      const fixture = submitFailingWith(
        new HttpErrorResponse({ status: 401, error: { error: 'invalid_credentials' } }),
      );

      expect(router.navigateByUrl).not.toHaveBeenCalled();
      expect(errorText(fixture)).toContain('Wrong username or password');
      expect(errorText(fixture)).not.toContain('locked');
      expect(errorText(fixture)).not.toContain('reach the server');
    });

    it('renders its own distinct message on the reserved 423 locked error', () => {
      const fixture = submitFailingWith(
        new HttpErrorResponse({ status: 423, error: { error: 'locked' } }),
      );

      expect(errorText(fixture)).toContain('locked');
      expect(errorText(fixture)).not.toContain('Wrong username or password');
      expect(errorText(fixture)).not.toContain('reach the server');
    });

    it('renders the cannot-reach message when the server is unreachable (status 0)', () => {
      const fixture = submitFailingWith(new HttpErrorResponse({ status: 0 }));

      expect(errorText(fixture)).toContain('reach the server');
      expect(errorText(fixture)).not.toContain('Wrong username or password');
      expect(errorText(fixture)).not.toContain('locked');
    });

    it('renders the cannot-reach message on a 5xx server failure', () => {
      const fixture = submitFailingWith(new HttpErrorResponse({ status: 503 }));

      expect(errorText(fixture)).toContain('reach the server');
    });

    it('falls back to a generic message on an unexpected error', () => {
      const fixture = submitFailingWith(
        new HttpErrorResponse({ status: 400, error: { error: 'invalid_request' } }),
      );

      expect(errorText(fixture)).toContain('Something went wrong');
      expect(errorText(fixture)).not.toContain('Wrong username or password');
    });

    it('marks the error as an alert so screen readers announce it', () => {
      const fixture = submitFailingWith(
        new HttpErrorResponse({ status: 401, error: { error: 'invalid_credentials' } }),
      );

      const error = fixture.nativeElement.querySelector('.login-card__error');
      expect(error?.getAttribute('role')).toBe('alert');
    });

    it('clears the error as soon as the user edits the form', () => {
      const fixture = submitFailingWith(
        new HttpErrorResponse({ status: 401, error: { error: 'invalid_credentials' } }),
      );
      expect(errorText(fixture)).not.toBe('');

      const input: HTMLInputElement = fixture.nativeElement.querySelector('#login-password');
      input.value = 'corrected';
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('.login-card__error')).toBeNull();
    });
  });

  describe('pending state', () => {
    function submitPending() {
      const login$ = new Subject<UserSession>();
      store.login.and.returnValue(login$.asObservable());
      const fixture = createComponent();
      fixture.componentInstance.form.patchValue({ username: 'operation', password: 'operation123!' });
      fixture.componentInstance.submit();
      fixture.detectChanges();
      return { fixture, login$ };
    }

    function submitButton(fixture: { nativeElement: HTMLElement }): HTMLButtonElement {
      return fixture.nativeElement.querySelector('.login-card__submit') as HTMLButtonElement;
    }

    it('disables submit and shows a spinner while the request is in flight', () => {
      const { fixture } = submitPending();

      expect(submitButton(fixture).disabled).toBeTrue();
      expect(fixture.nativeElement.querySelector('.login-card__spinner')).not.toBeNull();
    });

    it('ignores a second submit while the first request is still pending', () => {
      const { fixture } = submitPending();

      fixture.componentInstance.submit();

      expect(store.login).toHaveBeenCalledTimes(1);
    });

    it('re-enables submit when the post-login navigation fails (stale returnUrl, no wildcard route)', fakeAsync(() => {
      // A host app without a wildcard route can reject a stale returnUrl —
      // navigateByUrl resolves false. pending must not stay stuck true, or
      // the user is stranded on the login page with a dead submit button.
      (router.navigateByUrl as jasmine.Spy).and.resolveTo(false);
      store.login.and.returnValue(of(session));
      const fixture = createComponent();
      fixture.componentInstance.form.patchValue({ username: 'operation', password: 'operation123!' });

      fixture.componentInstance.submit();
      tick(); // let the navigation promise resolve (to false)
      fixture.detectChanges();

      expect(submitButton(fixture).disabled).toBeFalse();
      expect(fixture.nativeElement.querySelector('.login-card__spinner')).toBeNull();
    }));

    it('re-enables submit and removes the spinner when the request fails', () => {
      const { fixture, login$ } = submitPending();

      login$.error(new HttpErrorResponse({ status: 401, error: { error: 'invalid_credentials' } }));
      fixture.detectChanges();

      expect(submitButton(fixture).disabled).toBeFalse();
      expect(fixture.nativeElement.querySelector('.login-card__spinner')).toBeNull();
    });
  });
});
