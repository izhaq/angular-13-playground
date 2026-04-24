import { TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { RouterTestingModule } from '@angular/router/testing';

import { AppComponent } from './app.component';

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      // RouterTestingModule supplies the router-outlet + routerLink
      // directives the template uses. Without it, Karma flags a "full
      // page reload" because the unrouted <a routerLink> resolves to a
      // real href that the browser would actually follow.
      imports: [NoopAnimationsModule, RouterTestingModule],
      declarations: [AppComponent],
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
});
