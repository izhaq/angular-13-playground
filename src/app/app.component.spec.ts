import { TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';

import { AppComponent } from './app.component';
import { AUTH_API, AuthApi } from './features/auth/auth-contract';
import { SessionIndicatorComponent } from './features/auth/session-indicator/session-indicator.component';

describe('AppComponent', () => {
  beforeEach(async () => {
    const api = jasmine.createSpyObj<AuthApi>('AuthApi', ['login', 'logout', 'session']);

    await TestBed.configureTestingModule({
      // RouterTestingModule supplies the router-outlet + routerLink
      // directives the template uses. Without it, Karma flags a "full
      // page reload" because the unrouted <a routerLink> resolves to a
      // real href that the browser would actually follow.
      imports: [RouterTestingModule, SessionIndicatorComponent],
      declarations: [AppComponent],
      providers: [{ provide: AUTH_API, useValue: api }],
    }).compileComponents();
  });

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

  // The session chrome's behavior (show/hide, logout) is the auth feature's
  // own — see session-indicator.component.spec.ts. The shell only mounts it.
  it('mounts the auth session indicator in the nav', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.app-nav auth-session-indicator')).toBeTruthy();
  });
});
