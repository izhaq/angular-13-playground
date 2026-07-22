import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';

import { AUTH_API, AuthApi, UserSession } from '../auth-contract';
import { LOGIN_URL } from '../auth-urls';
import { SessionStore } from '../session.store';
import { SessionIndicatorComponent } from './session-indicator.component';

describe('SessionIndicatorComponent', () => {
  let api: jasmine.SpyObj<AuthApi>;

  // Username and mode deliberately differ so each assertion below can only
  // be satisfied by the right field.
  const session: UserSession = {
    user: { username: 'operation', mode: 'technician', position: 'active' },
    expiresAt: '2026-07-22T12:00:00+00:00',
  };

  beforeEach(async () => {
    api = jasmine.createSpyObj<AuthApi>('AuthApi', ['login', 'logout', 'session']);

    await TestBed.configureTestingModule({
      // RouterTestingModule backs the Router the component navigates with.
      imports: [SessionIndicatorComponent, RouterTestingModule],
      providers: [{ provide: AUTH_API, useValue: api }],
    }).compileComponents();
  });

  /** Fills the root SessionStore the way the app does — through its api. */
  function logIn(): void {
    api.session.and.returnValue(of(session));
    TestBed.inject(SessionStore).restore().subscribe();
  }

  function indicator(fixture: { nativeElement: HTMLElement }): HTMLElement | null {
    return fixture.nativeElement.querySelector('.auth-session-indicator');
  }

  it('renders nothing while logged out — safe to place unconditionally', () => {
    const fixture = TestBed.createComponent(SessionIndicatorComponent);
    fixture.detectChanges();

    expect(indicator(fixture)).toBeNull();
    expect((fixture.nativeElement.textContent ?? '').trim()).toBe('');
  });

  it('shows the logged-in username, mode, and a logout button', () => {
    logIn();
    const fixture = TestBed.createComponent(SessionIndicatorComponent);
    fixture.detectChanges();

    const chrome = indicator(fixture);
    expect(chrome).toBeTruthy();
    expect(chrome?.textContent).toContain('operation'); // username
    expect(chrome?.textContent).toContain('technician'); // mode
    const button = chrome?.querySelector<HTMLButtonElement>('button.auth-session-indicator__logout');
    expect(button).toBeTruthy();
  });

  it('appears when the session starts after initial render, and disappears on logout', () => {
    // Mid-life flip: the component is created logged OUT, the store changes
    // afterwards. Proves the template tracks the signal, not just its value
    // at construction time.
    const fixture = TestBed.createComponent(SessionIndicatorComponent);
    fixture.detectChanges();
    expect(indicator(fixture)).toBeNull();

    logIn();
    fixture.detectChanges();
    expect(indicator(fixture)).toBeTruthy();

    TestBed.inject(SessionStore).clear();
    fixture.detectChanges();
    expect(indicator(fixture)).toBeNull();
  });

  it('logs out through the store and navigates to the login page on click', () => {
    logIn();
    const store = TestBed.inject(SessionStore);
    const logoutSpy = spyOn(store, 'logout').and.returnValue(of(undefined));
    const navigateSpy = spyOn(TestBed.inject(Router), 'navigateByUrl');
    const fixture = TestBed.createComponent(SessionIndicatorComponent);
    fixture.detectChanges();

    fixture.nativeElement.querySelector('button.auth-session-indicator__logout').click();

    expect(logoutSpy).toHaveBeenCalledTimes(1);
    expect(navigateSpy).toHaveBeenCalledOnceWith(LOGIN_URL);
  });
});
