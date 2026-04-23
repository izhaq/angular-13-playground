import { Component, ViewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatButtonModule } from '@angular/material/button';
import { By } from '@angular/platform-browser';

import { BOARD_IDS, BoardId } from '../../shared/ids';
import { ENGINE_SIM_LABELS as L } from '../../shared/labels';
import { BoardFooterComponent } from './board-footer.component';

/**
 * Host wrapper so inputs flow through Angular's binding system. Required
 * because the child uses OnPush — direct property mutation would not
 * dirty its view.
 */
@Component({
  template: `
    <engine-sim-board-footer
      [boardId]="boardId"
      [disabled]="disabled"
      (defaults)="events.push('defaults')"
      (cancel)="events.push('cancel')"
      (apply)="events.push('apply')">
    </engine-sim-board-footer>
  `,
})
class HostComponent {
  boardId: BoardId = BOARD_IDS.primary;
  disabled = false;
  events: string[] = [];
  @ViewChild(BoardFooterComponent, { static: true }) footer!: BoardFooterComponent;
}

describe('BoardFooterComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [BoardFooterComponent, HostComponent],
      imports: [NoopAnimationsModule, MatButtonModule],
    }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  function btn(boardId: string, action: 'defaults' | 'cancel' | 'apply'): HTMLButtonElement {
    return fixture.debugElement.query(
      By.css(`[data-test-id="footer-${boardId}-${action}"]`),
    ).nativeElement;
  }

  it('renders three buttons with namespaced test ids', () => {
    expect(btn('primary', 'defaults')).toBeTruthy();
    expect(btn('primary', 'cancel')).toBeTruthy();
    expect(btn('primary', 'apply')).toBeTruthy();
  });

  it('uses centralized labels for button text', () => {
    expect(btn('primary', 'defaults').textContent?.trim()).toBe(L.defaults);
    expect(btn('primary', 'cancel').textContent?.trim()).toBe(L.cancel);
    expect(btn('primary', 'apply').textContent?.trim()).toBe(L.apply);
  });

  it('emits the matching output for each button click', () => {
    btn('primary', 'defaults').click();
    btn('primary', 'cancel').click();
    btn('primary', 'apply').click();

    expect(host.events).toEqual(['defaults', 'cancel', 'apply']);
  });

  it('disables all buttons when @Input() disabled is true', () => {
    host.disabled = true;
    fixture.detectChanges();

    expect(btn('primary', 'defaults').disabled).toBe(true);
    expect(btn('primary', 'cancel').disabled).toBe(true);
    expect(btn('primary', 'apply').disabled).toBe(true);
  });

  it('namespaces test ids by boardId so secondary footer is unique', () => {
    host.boardId = BOARD_IDS.secondary;
    fixture.detectChanges();

    expect(btn('secondary', 'apply')).toBeTruthy();
  });
});
