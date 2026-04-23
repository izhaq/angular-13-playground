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

  it('groups form and grid inside the scrollable body container', () => {
    // The body is the scrollable middle (form + grid live here, cmd/footer
    // do not). Asserting structural containment keeps the spec coupled to
    // the layout contract, not to specific CSS values.
    const body = fixture.debugElement.query(By.css('.engine-sim-board__body'));
    expect(body).toBeTruthy();
    expect(body.nativeElement.querySelector('.engine-sim-board__form')).toBeTruthy();
    expect(body.nativeElement.querySelector('.engine-sim-board__grid')).toBeTruthy();
    expect(body.nativeElement.querySelector('.engine-sim-board__cmd')).toBeNull();
    expect(body.nativeElement.querySelector('.engine-sim-board__footer')).toBeNull();
  });
});
