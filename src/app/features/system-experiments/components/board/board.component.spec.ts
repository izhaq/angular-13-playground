import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { BoardComponent } from './board.component';

/**
 * Host that projects uniquely-identifiable nodes — one per slot — so the
 * spec can assert each lands in the structural container the board layout
 * dictates. The board is a 3-slot surface: a sticky top band carries the
 * CMD section (form side) and the column header (data side) on one line,
 * with the unified form/data rows scrolling beneath. The action bar is
 * mounted by the SHELL outside the tab-group, so it is not a board concern.
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

  it('places cmd + header together in the sticky top band, above the rows', () => {
    // Shape contract: CMD and header share the sticky band (one line); rows
    // scroll beneath. Asserting structural containment keeps the spec coupled
    // to the layout contract, not to specific CSS values.
    const top = fixture.debugElement.query(By.css('.board__top'));
    expect(top).toBeTruthy();
    expect(top.nativeElement.querySelector('.board__cmd')).toBeTruthy();
    expect(top.nativeElement.querySelector('.board__header')).toBeTruthy();

    const scroll = fixture.debugElement.query(By.css('.board__scroll'));
    expect(scroll).toBeTruthy();
    expect(scroll.nativeElement.querySelector('.board__top')).toBeTruthy();
    expect(scroll.nativeElement.querySelector('.board__rows')).toBeTruthy();
  });
});
