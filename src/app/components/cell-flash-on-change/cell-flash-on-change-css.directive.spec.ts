import { Component } from '@angular/core';
import { ComponentFixture, fakeAsync, flush, TestBed, tick } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { CellFlashOnChangeCssDirective } from './cell-flash-on-change-css.directive';
import {
  DEFAULT_FLASH_DURATION_MS,
  FLASH_CLASS,
  FlashableValue,
} from './cell-flash-on-change.types';

@Component({
  template: `<div [appFlashOnChangeCss]="value" [flashDurationMs]="duration"></div>`,
})
class HostComponent {
  value: FlashableValue = 'initial';
  duration = DEFAULT_FLASH_DURATION_MS;
}

describe('CellFlashOnChangeCssDirective', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;
  let el: HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [HostComponent, CellFlashOnChangeCssDirective],
    });
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    // Initial CD = the directive's "first value emission" (value: 'initial').
    // No flash here; subsequent value changes are real changes.
    fixture.detectChanges();
    el = fixture.debugElement
      .query(By.directive(CellFlashOnChangeCssDirective))
      .nativeElement as HTMLElement;
  });

  afterEach(() => {
    // Idempotent — Angular's ComponentFixture guards against double-destroy.
    fixture.destroy();
  });

  it('does NOT flash on the first value emission', () => {
    expect(el.classList.contains(FLASH_CLASS)).toBe(false);
  });

  it('flashes when the value changes', fakeAsync(() => {
    host.value = 'changed';
    fixture.detectChanges();
    expect(el.classList.contains(FLASH_CLASS)).toBe(true);
    flush();
  }));

  it('does NOT flash when the value is re-set to the same value', () => {
    host.value = 'initial';
    fixture.detectChanges();
    expect(el.classList.contains(FLASH_CLASS)).toBe(false);
  });

  it('clears the highlight after flashDurationMs (default 10 000 ms)', fakeAsync(() => {
    host.value = 'changed';
    fixture.detectChanges();
    expect(el.classList.contains(FLASH_CLASS)).toBe(true);

    tick(DEFAULT_FLASH_DURATION_MS - 1);
    expect(el.classList.contains(FLASH_CLASS)).toBe(true);

    tick(1);
    expect(el.classList.contains(FLASH_CLASS)).toBe(false);
  }));

  it('clears the highlight after a custom flashDurationMs', fakeAsync(() => {
    host.duration = 3_000;
    fixture.detectChanges();
    host.value = 'changed';
    fixture.detectChanges();
    expect(el.classList.contains(FLASH_CLASS)).toBe(true);

    tick(2_999);
    expect(el.classList.contains(FLASH_CLASS)).toBe(true);

    tick(1);
    expect(el.classList.contains(FLASH_CLASS)).toBe(false);
  }));

  it('writes animation-duration inline style equal to flashDurationMs', fakeAsync(() => {
    host.duration = 4_242;
    fixture.detectChanges();
    host.value = 'changed';
    fixture.detectChanges();
    expect(el.style.animationDuration).toBe('4242ms');
    flush();
  }));

  it('cancels the in-flight flash and restarts cleanly when the value changes mid-flash', fakeAsync(() => {
    host.value = 'first-change';
    fixture.detectChanges();
    expect(el.classList.contains(FLASH_CLASS)).toBe(true);

    tick(5_000);
    expect(el.classList.contains(FLASH_CLASS)).toBe(true);

    host.value = 'second-change';
    fixture.detectChanges();
    expect(el.classList.contains(FLASH_CLASS)).toBe(true);

    // The original timer would have fired at t=10000 (5s ago + 5s remaining).
    // It was cancelled; the new timer fires DEFAULT_FLASH_DURATION_MS after the retrigger.
    tick(DEFAULT_FLASH_DURATION_MS - 1);
    expect(el.classList.contains(FLASH_CLASS)).toBe(true);

    tick(1);
    expect(el.classList.contains(FLASH_CLASS)).toBe(false);
  }));

  it('treats falsy primitives (0, false, "") as real values, not "no value"', fakeAsync(() => {
    // 'initial' → 0 — different → flash
    host.value = 0;
    fixture.detectChanges();
    expect(el.classList.contains(FLASH_CLASS)).toBe(true);
    flush();

    // 0 → 0 — same → no flash
    host.value = 0;
    fixture.detectChanges();
    expect(el.classList.contains(FLASH_CLASS)).toBe(false);

    // 0 → false — different (Object.is(0, false) === false) → flash
    host.value = false;
    fixture.detectChanges();
    expect(el.classList.contains(FLASH_CLASS)).toBe(true);
    flush();

    // false → false — same → no flash
    host.value = false;
    fixture.detectChanges();
    expect(el.classList.contains(FLASH_CLASS)).toBe(false);

    // false → '' — different → flash
    host.value = '';
    fixture.detectChanges();
    expect(el.classList.contains(FLASH_CLASS)).toBe(true);
    flush();

    // '' → '' — same → no flash
    host.value = '';
    fixture.detectChanges();
    expect(el.classList.contains(FLASH_CLASS)).toBe(false);
  }));

  it('treats NaN -> NaN as equal (Object.is) and does NOT flash', fakeAsync(() => {
    host.value = NaN;
    fixture.detectChanges();
    expect(el.classList.contains(FLASH_CLASS)).toBe(true);
    flush();

    // Angular's input-change check uses ===, so NaN !== NaN triggers ngOnChanges
    // again — but Object.is(NaN, NaN) === true, so the directive does NOT flash.
    host.value = NaN;
    fixture.detectChanges();
    expect(el.classList.contains(FLASH_CLASS)).toBe(false);
  }));

  it('cancels in-flight work in ngOnDestroy and leaves no scheduled timers', fakeAsync(() => {
    host.value = 'changed';
    fixture.detectChanges();
    expect(el.classList.contains(FLASH_CLASS)).toBe(true);

    fixture.destroy();

    // If the timer wasn't cancelled, it would fire at t=DEFAULT_FLASH_DURATION_MS
    // and remove the class. After destroy, the class stays put on the now-detached
    // element — proof the timer was cancelled.
    tick(DEFAULT_FLASH_DURATION_MS + 100);
    expect(el.classList.contains(FLASH_CLASS)).toBe(true);
  }));
});
