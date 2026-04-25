import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { BoardComponent } from './board.component';

/**
 * Host that projects three uniquely-identifiable nodes — one per slot —
 * so the spec can assert each one lands in the structural container the
 * board layout dictates. The assertion is "this id is inside that
 * container", which is exactly the contract a layout component owes its
 * consumer.
 *
 * The board is a 3-slot surface (cmd / form / grid). The action bar
 * (Defaults / Cancel / Apply) is mounted by the SHELL outside the
 * tab-group as a single shared instance, so it is intentionally not a
 * board concern.
 */
@Component({
  template: `
    <system-experiments-board>
      <div boardCmd  data-test-id="cmd-marker">CMD</div>
      <div boardForm data-test-id="form-marker">FORM</div>
      <div boardGrid data-test-id="grid-marker">GRID</div>
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
    expect(fixture.debugElement.query(By.css('.board__form'))).toBeTruthy();
    expect(fixture.debugElement.query(By.css('.board__grid'))).toBeTruthy();
  });

  it('does NOT render a footer slot — the shell owns the shared footer', () => {
    expect(fixture.debugElement.query(By.css('.board__footer'))).toBeNull();
  });

  it('projects [boardCmd] content into the cmd slot', () => {
    expect(markerInside('board__cmd', 'cmd-marker')).toBe(true);
  });

  it('projects [boardForm] content into the form slot', () => {
    expect(markerInside('board__form', 'form-marker')).toBe(true);
  });

  it('projects [boardGrid] content into the grid slot', () => {
    expect(markerInside('board__grid', 'grid-marker')).toBe(true);
  });

  it('groups cmd, form, and grid inside the body container', () => {
    // The body holds the left pane (cmd + form stacked) and the grid pane
    // side-by-side. Asserting structural containment keeps the spec
    // coupled to the layout contract, not to specific CSS values.
    const body = fixture.debugElement.query(By.css('.board__body'));
    expect(body).toBeTruthy();
    expect(body.nativeElement.querySelector('.board__cmd')).toBeTruthy();
    expect(body.nativeElement.querySelector('.board__form')).toBeTruthy();
    expect(body.nativeElement.querySelector('.board__grid')).toBeTruthy();
  });

  it('stacks cmd above form inside the left pane (sharing width)', () => {
    // CMD width = form width is the whole point of the left-pane shape —
    // assert the structural fact that drives the visual outcome.
    const left = fixture.debugElement.query(By.css('.board__left'));
    expect(left).toBeTruthy();
    expect(left.nativeElement.querySelector('.board__cmd')).toBeTruthy();
    expect(left.nativeElement.querySelector('.board__form')).toBeTruthy();
    expect(left.nativeElement.querySelector('.board__grid')).toBeNull();
  });
});
