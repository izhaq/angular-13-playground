import { TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';

import { AppComponent } from './app.component';
import { AUTH_API, AuthApi, UserSession } from './features/auth/auth-contract';
import { LOGIN_URL } from './features/auth/auth-urls';
import { SessionStore } from './features/auth/session.store';

describe('AppComponent', () => {
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
      // RouterTestingModule supplies the router-outlet + routerLink
      // directives the template uses. Without it, Karma flags a "full
      // page reload" because the unrouted <a routerLink> resolves to a
      // real href that the browser would actually follow.
      imports: [NoopAnimationsModule, RouterTestingModule],
      declarations: [AppComponent],
      providers: [{ provide: AUTH_API, useValue: api }],
    }).compileComponents();
  });

  /** Fills the root SessionStore the way the app does — through its api. */
  function logIn(): void {
    api.session.and.returnValue(of(session));
    TestBed.inject(SessionStore).restore().subscribe();
  }

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render the top nav with Dashboard and Components links', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const nav: HTMLElement = fixture.nativeElement.querySelector('.app-nav');
    expect(nav).toBeTruthy();
    const linkText = Array.from(nav.querySelectorAll('a')).map((a) => a.textContent?.trim());
    expect(linkText).toContain('Dashboard');
    expect(linkText).toContain('Components');
  });

  it('hides the session chrome while logged out', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.app-nav__session')).toBeNull();
  });

  it('shows the logged-in username, mode, and a logout button', () => {
    logIn();
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();

    const chrome: HTMLElement = fixture.nativeElement.querySelector('.app-nav__session');
    expect(chrome).toBeTruthy();
    expect(chrome.textContent).toContain('operation'); // username
    expect(chrome.textContent).toContain('technician'); // mode
    const button = chrome.querySelector<HTMLButtonElement>('button.app-nav__logout');
    expect(button).toBeTruthy();
  });

  it('logs out through the store and navigates to the login page on click', () => {
    logIn();
    const store = TestBed.inject(SessionStore);
    const logoutSpy = spyOn(store, 'logout').and.returnValue(of(undefined));
    const navigateSpy = spyOn(TestBed.inject(Router), 'navigateByUrl');
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();

    fixture.nativeElement.querySelector('button.app-nav__logout').click();

    expect(logoutSpy).toHaveBeenCalledTimes(1);
    expect(navigateSpy).toHaveBeenCalledOnceWith(LOGIN_URL);
  });
});
