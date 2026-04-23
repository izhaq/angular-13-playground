import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { EngineSimBoardComponent } from './engine-sim-board.component';

/**
 * Host that projects four uniquely-identifiable nodes — one per slot —
 * so the spec can assert each one lands in the structural container the
 * board layout dictates. The assertion is "this id is inside that
 * container", which is exactly the contract a layout component owes its
 * consumer.
 */
@Component({
  template: `
    <engine-sim-board>
      <div boardCmd    data-test-id="cmd-marker">CMD</div>
      <div boardForm   data-test-id="form-marker">FORM</div>
      <div boardGrid   data-test-id="grid-marker">GRID</div>
      <div boardFooter data-test-id="footer-marker">FOOTER</div>
    </engine-sim-board>
  `,
})
class HostComponent {}

describe('EngineSimBoardComponent', () => {
  let fixture: ComponentFixture<HostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [EngineSimBoardComponent, HostComponent],
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

  it('renders the four structural slot containers', () => {
    expect(fixture.debugElement.query(By.css('.engine-sim-board__cmd'))).toBeTruthy();
    expect(fixture.debugElement.query(By.css('.engine-sim-board__form'))).toBeTruthy();
    expect(fixture.debugElement.query(By.css('.engine-sim-board__grid'))).toBeTruthy();
    expect(fixture.debugElement.query(By.css('.engine-sim-board__footer'))).toBeTruthy();
  });

  it('projects [boardCmd] content into the cmd slot', () => {
    expect(markerInside('engine-sim-board__cmd', 'cmd-marker')).toBe(true);
  });

  it('projects [boardForm] content into the form slot', () => {
    expect(markerInside('engine-sim-board__form', 'form-marker')).toBe(true);
  });

  it('projects [boardGrid] content into the grid slot', () => {
    expect(markerInside('engine-sim-board__grid', 'grid-marker')).toBe(true);
  });

  it('projects [boardFooter] content into the footer slot', () => {
    expect(markerInside('engine-sim-board__footer', 'footer-marker')).toBe(true);
  });

  it('groups cmd, form, and grid inside the scrollable body; footer outside', () => {
    // The body holds the left pane (cmd + form stacked) and the grid pane
    // side-by-side. The footer is a sibling of the body, not inside it,
    // because it spans the full board width. Asserting structural
    // containment keeps the spec coupled to the layout contract, not to
    // specific CSS values.
    const body = fixture.debugElement.query(By.css('.engine-sim-board__body'));
    expect(body).toBeTruthy();
    expect(body.nativeElement.querySelector('.engine-sim-board__cmd')).toBeTruthy();
    expect(body.nativeElement.querySelector('.engine-sim-board__form')).toBeTruthy();
    expect(body.nativeElement.querySelector('.engine-sim-board__grid')).toBeTruthy();
    expect(body.nativeElement.querySelector('.engine-sim-board__footer')).toBeNull();
  });

  it('stacks cmd above form inside the left pane (sharing width)', () => {
    // CMD width = form width is the whole point of the left-pane shape —
    // assert the structural fact that drives the visual outcome.
    const left = fixture.debugElement.query(By.css('.engine-sim-board__left'));
    expect(left).toBeTruthy();
    expect(left.nativeElement.querySelector('.engine-sim-board__cmd')).toBeTruthy();
    expect(left.nativeElement.querySelector('.engine-sim-board__form')).toBeTruthy();
    expect(left.nativeElement.querySelector('.engine-sim-board__grid')).toBeNull();
  });
});
