import { Component, ViewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { AppLoadingOverlayComponent } from './app-loading-overlay.component';

/**
 * Host wrapper so `loading` flows through Angular's binding system —
 * the overlay is OnPush, so direct property mutation would not dirty
 * its view.
 */
@Component({
  template: `
    <app-loading-overlay
      [loading]="loading"
      [spinnerTestId]="spinnerTestId">
      <button class="wrapped" data-test-id="wrapped">Click</button>
    </app-loading-overlay>
  `,
})
class HostComponent {
  loading = false;
  spinnerTestId = '';
  @ViewChild(AppLoadingOverlayComponent, { static: true }) overlay!: AppLoadingOverlayComponent;
}

describe('AppLoadingOverlayComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AppLoadingOverlayComponent, HostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  function hostEl(): HTMLElement {
    return fixture.debugElement.query(By.directive(AppLoadingOverlayComponent)).nativeElement;
  }

  function shadeEl(): HTMLElement | null {
    return fixture.debugElement.nativeElement.querySelector('.loading-overlay__shade');
  }

  it('projects content always (loading defaults to false)', () => {
    expect(fixture.debugElement.query(By.css('.wrapped'))).toBeTruthy();
    expect(shadeEl()).toBeNull();
  });

  it('renders the shade + spinner when loading is true', () => {
    host.loading = true;
    fixture.detectChanges();

    const shade = shadeEl();
    expect(shade).not.toBeNull();
    expect(shade!.querySelector('.loading-overlay__spinner')).not.toBeNull();
  });

  it('removes the shade again when loading flips back to false', () => {
    host.loading = true;
    fixture.detectChanges();
    expect(shadeEl()).not.toBeNull();

    host.loading = false;
    fixture.detectChanges();
    expect(shadeEl()).toBeNull();
  });

  it('toggles the host `.is-loading` class with the loading flag', () => {
    expect(hostEl().classList.contains('is-loading')).toBe(false);

    host.loading = true;
    fixture.detectChanges();
    expect(hostEl().classList.contains('is-loading')).toBe(true);
  });

  it('drives `aria-busy` on the host (true while loading, absent otherwise)', () => {
    expect(hostEl().getAttribute('aria-busy')).toBeNull();

    host.loading = true;
    fixture.detectChanges();
    expect(hostEl().getAttribute('aria-busy')).toBe('true');
  });

  it('forwards spinnerTestId onto the spinner element when provided', () => {
    host.loading = true;
    host.spinnerTestId = 'my-spinner';
    fixture.detectChanges();

    const spinner = fixture.debugElement.nativeElement.querySelector('[data-test-id="my-spinner"]');
    expect(spinner).not.toBeNull();
    expect(spinner.classList.contains('loading-overlay__spinner')).toBe(true);
  });

  it('omits the data-test-id attribute when spinnerTestId is empty', () => {
    host.loading = true;
    host.spinnerTestId = '';
    fixture.detectChanges();

    const spinner = fixture.debugElement.nativeElement.querySelector('.loading-overlay__spinner');
    expect(spinner).not.toBeNull();
    expect(spinner.hasAttribute('data-test-id')).toBe(false);
  });
});
