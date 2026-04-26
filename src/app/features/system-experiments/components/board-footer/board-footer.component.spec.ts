import { Component, ViewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatButtonModule } from '@angular/material/button';
import { By } from '@angular/platform-browser';

import { SYSTEM_EXPERIMENTS_LABELS as L } from '../../shared/labels';
import { AppLoadingOverlayComponent } from '../../../../components/app-loading-overlay/app-loading-overlay.component';
import { BoardFooterComponent, FooterLoadingButton } from './board-footer.component';

/**
 * Host wrapper so inputs flow through Angular's binding system. Required
 * because the child uses OnPush — direct property mutation would not
 * dirty its view.
 */
@Component({
  template: `
    <system-experiments-board-footer
      [disabled]="disabled"
      [applyDisabled]="applyDisabled"
      [loading]="loading"
      (defaults)="events.push('defaults')"
      (cancel)="events.push('cancel')"
      (apply)="events.push('apply')">
    </system-experiments-board-footer>
  `,
})
class HostComponent {
  disabled = false;
  applyDisabled = false;
  loading: FooterLoadingButton = null;
  events: string[] = [];
  @ViewChild(BoardFooterComponent, { static: true }) footer!: BoardFooterComponent;
}

describe('BoardFooterComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [BoardFooterComponent, AppLoadingOverlayComponent, HostComponent],
      imports: [NoopAnimationsModule, MatButtonModule],
    }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  function btn(action: 'defaults' | 'cancel' | 'apply'): HTMLButtonElement {
    return fixture.debugElement.query(
      By.css(`[data-test-id="footer-${action}"]`),
    ).nativeElement;
  }

  function spinner(action: 'defaults' | 'apply'): HTMLElement | null {
    return fixture.debugElement.nativeElement.querySelector(
      `[data-test-id="footer-${action}-spinner"]`,
    );
  }

  it('renders three buttons with stable test ids (singleton — no board namespace)', () => {
    expect(btn('defaults')).toBeTruthy();
    expect(btn('cancel')).toBeTruthy();
    expect(btn('apply')).toBeTruthy();
  });

  it('uses centralized labels for button text', () => {
    expect(btn('defaults').textContent?.trim()).toBe(L.defaults);
    expect(btn('cancel').textContent?.trim()).toBe(L.cancel);
    expect(btn('apply').textContent?.trim()).toBe(L.apply);
  });

  it('emits the matching output for each button click', () => {
    btn('defaults').click();
    btn('cancel').click();
    btn('apply').click();

    expect(host.events).toEqual(['defaults', 'cancel', 'apply']);
  });

  it('disables all buttons when @Input() disabled is true', () => {
    host.disabled = true;
    fixture.detectChanges();

    expect(btn('defaults').disabled).toBe(true);
    expect(btn('cancel').disabled).toBe(true);
    expect(btn('apply').disabled).toBe(true);
  });

  it('disables ONLY Apply when applyDisabled is true (defaults + cancel stay clickable)', () => {
    host.applyDisabled = true;
    fixture.detectChanges();

    expect(btn('apply').disabled).toBe(true);
    expect(btn('defaults').disabled).toBe(false);
    expect(btn('cancel').disabled).toBe(false);
  });

  it('keeps Apply disabled when either disabled OR applyDisabled is true', () => {
    host.disabled = true;
    host.applyDisabled = false;
    fixture.detectChanges();
    expect(btn('apply').disabled).toBe(true);

    host.disabled = false;
    host.applyDisabled = true;
    fixture.detectChanges();
    expect(btn('apply').disabled).toBe(true);

    host.disabled = false;
    host.applyDisabled = false;
    fixture.detectChanges();
    expect(btn('apply').disabled).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // loading — single-flight footer. The matching button gets the spinner
  // overlay; the other two are disabled but show no spinner of their own.
  // ---------------------------------------------------------------------------

  it('renders neither spinner when loading is null', () => {
    expect(spinner('defaults')).toBeNull();
    expect(spinner('apply')).toBeNull();
  });

  it('renders ONLY the defaults spinner when loading === "defaults"', () => {
    host.loading = 'defaults';
    fixture.detectChanges();

    expect(spinner('defaults')).not.toBeNull();
    expect(spinner('apply')).toBeNull();
  });

  it('renders ONLY the apply spinner when loading === "apply"', () => {
    host.loading = 'apply';
    fixture.detectChanges();

    expect(spinner('apply')).not.toBeNull();
    expect(spinner('defaults')).toBeNull();
  });

  it('marks ONLY the matching loading-overlay host with `.is-loading`', () => {
    host.loading = 'apply';
    fixture.detectChanges();

    const wrappingOverlay = (action: 'defaults' | 'cancel' | 'apply'): HTMLElement => {
      return btn(action).closest('app-loading-overlay') as HTMLElement;
    };

    expect(wrappingOverlay('apply').classList.contains('is-loading')).toBe(true);
    expect(wrappingOverlay('defaults').classList.contains('is-loading')).toBe(false);
    expect(wrappingOverlay('cancel').classList.contains('is-loading')).toBe(false);
  });

  it('disables ALL three buttons while ANY action is in flight (single-flight footer)', () => {
    host.loading = 'apply';
    fixture.detectChanges();

    expect(btn('apply').disabled).toBe(true);
    expect(btn('defaults').disabled).toBe(true);
    expect(btn('cancel').disabled).toBe(true);

    host.loading = 'defaults';
    fixture.detectChanges();

    expect(btn('apply').disabled).toBe(true);
    expect(btn('defaults').disabled).toBe(true);
    expect(btn('cancel').disabled).toBe(true);
  });

  it('clears the cross-button disable when loading returns to null', () => {
    host.loading = 'apply';
    fixture.detectChanges();
    expect(btn('cancel').disabled).toBe(true);

    host.loading = null;
    fixture.detectChanges();
    expect(btn('cancel').disabled).toBe(false);
    expect(btn('defaults').disabled).toBe(false);
    expect(btn('apply').disabled).toBe(false);
  });
});
