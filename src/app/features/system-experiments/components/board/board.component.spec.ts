import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { BoardComponent } from './board.component';

/**
 * Host that projects uniquely-identifiable nodes — one per slot — so the
 * spec can assert each lands in the structural container the board layout
 * dictates. The board is a 3-slot surface: a fixed top band carries the
 * CMD section (form side) and the column header (data side) on one line,
 * with the form/data rows scrolling beneath (only `.board__rows` scrolls).
 * The action bar is mounted by the SHELL outside the tab-group, so it is
 * not a board concern.
 */
@Component({
  template: `
    <system-experiments-board>
      <div boardCmd    data-test-id="cmd-marker">CMD</div>
      <div boardHeader data-test-id="header-marker">HEADER</div>
      <div boardRows   data-test-id="rows-marker">ROWS</div>
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

  it('renders the three structural slot containers', () => {
    expect(fixture.debugElement.query(By.css('.board__cmd'))).toBeTruthy();
    expect(fixture.debugElement.query(By.css('.board__header'))).toBeTruthy();
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

  it('projects [boardHeader] content into the header slot', () => {
    expect(markerInside('board__header', 'header-marker')).toBe(true);
  });

  it('projects [boardRows] content into the rows slot', () => {
    expect(markerInside('board__rows', 'rows-marker')).toBe(true);
  });

  it('places cmd + header together in the fixed top band, above the scrolling rows', () => {
    // Shape contract: CMD and header share the top band (one line); the rows
    // region is a separate sibling that scrolls. Asserting structural
    // containment keeps the spec coupled to the layout contract, not to
    // specific CSS values.
    const top = fixture.debugElement.query(By.css('.board__top'));
    expect(top).toBeTruthy();
    expect(top.nativeElement.querySelector('.board__cmd')).toBeTruthy();
    expect(top.nativeElement.querySelector('.board__header')).toBeTruthy();

    // Rows are a sibling of the band (not nested inside it), so only the rows
    // scroll while the band stays put.
    const board = fixture.debugElement.query(By.css('.board'));
    expect(board.nativeElement.querySelector('.board__rows')).toBeTruthy();
    expect(top.nativeElement.querySelector('.board__rows')).toBeNull();
  });
});
