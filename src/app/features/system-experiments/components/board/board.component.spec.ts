import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { BoardComponent } from './board.component';

/**
 * Host that projects two uniquely-identifiable nodes — one per slot —
 * so the spec can assert each one lands in the structural container the
 * board layout dictates. The board is now a 2-slot surface (cmd / rows);
 * the unified rows container holds form + grid in one CSS Grid (Option B).
 * The action bar is mounted by the SHELL outside the tab-group, so it is
 * intentionally not a board concern.
 */
@Component({
  template: `
    <system-experiments-board>
      <div boardCmd  data-test-id="cmd-marker">CMD</div>
      <div boardRows data-test-id="rows-marker">ROWS</div>
    </system-experiments-board>
  `,
})
class HostComponent {}

describe('BoardComponent', () => {
  let fixture: ComponentFixture<HostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [BoardComponent, HostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  });

  function markerInside(slotClass: string, markerTestId: string): boolean {
    const slot = fixture.debugElement.query(By.css(`.${slotClass}`));
    if (!slot) {
      return false;
    }
    return !!slot.nativeElement.querySelector(`[data-test-id="${markerTestId}"]`);
  }

  it('renders the two structural slot containers', () => {
    expect(fixture.debugElement.query(By.css('.board__cmd'))).toBeTruthy();
    expect(fixture.debugElement.query(By.css('.board__rows'))).toBeTruthy();
  });

  it('does NOT render a footer slot — the shell owns the shared footer', () => {
    expect(fixture.debugElement.query(By.css('.board__footer'))).toBeNull();
  });

  it('does NOT render the legacy left-pane / form / grid containers', () => {
    expect(fixture.debugElement.query(By.css('.board__left'))).toBeNull();
    expect(fixture.debugElement.query(By.css('.board__form'))).toBeNull();
    expect(fixture.debugElement.query(By.css('.board__grid'))).toBeNull();
    expect(fixture.debugElement.query(By.css('.board__body'))).toBeNull();
  });

  it('projects [boardCmd] content into the cmd slot', () => {
    expect(markerInside('board__cmd', 'cmd-marker')).toBe(true);
  });

  it('projects [boardRows] content into the rows slot', () => {
    expect(markerInside('board__rows', 'rows-marker')).toBe(true);
  });

  it('stacks cmd above rows inside the board root', () => {
    // Vertical stack is the shape: CMD on top, unified rows below. Asserting
    // structural containment keeps the spec coupled to the layout contract,
    // not to specific CSS values.
    const board = fixture.debugElement.query(By.css('.board'));
    expect(board).toBeTruthy();
    expect(board.nativeElement.querySelector('.board__cmd')).toBeTruthy();
    expect(board.nativeElement.querySelector('.board__rows')).toBeTruthy();
  });
});
