import { Component } from '@angular/core';
import { ComponentFixture, fakeAsync, flushMicrotasks, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { CellFlashOnChangeWaapiDirective } from './cell-flash-on-change-waapi.directive';
import {
  DEFAULT_FLASH_DURATION_MS,
  FLASH_COLOR_RGBA,
  FlashableValue,
} from './cell-flash-on-change.types';

@Component({
  template: `<div [appFlashOnChangeWaapi]="value" [flashDurationMs]="duration"></div>`,
})
class HostComponent {
  value: FlashableValue = 'initial';
  duration = DEFAULT_FLASH_DURATION_MS;
}

// WAAPI testing pattern (apply consistently across this spec):
//
// 1. After beforeEach's first detectChanges (the directive's "first
//    emission" no-flash path), spy on host.nativeElement.animate to
//    capture/inspect subsequent calls. Use `.and.callThrough()` so the
//    real animation actually runs and shows up in `el.getAnimations()`.
//
// 2. To assert NO flash: assert `el.getAnimations().length === 0` and/or
//    `animateSpy` was not called.
//
// 3. To assert a flash WAS triggered: assert `animateSpy` was called and
//    optionally inspect (keyframes, options) via `mostRecent().args`.
//
// 4. Drive the Animation lifecycle directly via `Animation.finish()` /
//    `Animation.cancel()` rather than waiting real time. Use fakeAsync +
//    `flushMicrotasks()` so onfinish callbacks fire deterministically.
//
// 5. The reduced-motion path lives in a separate describe; matchMedia is
//    stubbed before TestBed.createComponent so the directive picks up
//    the stubbed value when it queries on each flash.

describe('CellFlashOnChangeWaapiDirective', () => {
  describe('default behavior (no reduced-motion preference)', () => {
    let fixture: ComponentFixture<HostComponent>;
    let host: HostComponent;
    let el: HTMLElement;
    let animateSpy: jasmine.Spy;

    beforeEach(() => {
      TestBed.configureTestingModule({
        declarations: [HostComponent, CellFlashOnChangeWaapiDirective],
      });
      fixture = TestBed.createComponent(HostComponent);
      host = fixture.componentInstance;
      // First emission (value: 'initial') — directive's first-value no-flash path.
      fixture.detectChanges();
      el = fixture.debugElement
        .query(By.directive(CellFlashOnChangeWaapiDirective))
        .nativeElement as HTMLElement;
      animateSpy = spyOn(el, 'animate').and.callThrough();
    });

    afterEach(() => {
      // Cancel any leftover animations so they don't bleed into the next test.
      el.getAnimations().forEach((a) => a.cancel());
      fixture.destroy();
    });

    it('does NOT animate on the first value emission', () => {
      // The first emission happened in beforeEach BEFORE the spy was
      // installed; the proof of "no flash" is that no Animation exists.
      expect(el.getAnimations().length).toBe(0);
    });

    it('animates when the value changes', () => {
      host.value = 'changed';
      fixture.detectChanges();
      expect(animateSpy).toHaveBeenCalledTimes(1);
      expect(el.getAnimations().length).toBe(1);
    });

    it('does NOT animate when the value is re-set to the same value', () => {
      host.value = 'initial';
      fixture.detectChanges();
      expect(animateSpy).not.toHaveBeenCalled();
      expect(el.getAnimations().length).toBe(0);
    });

    it('passes the default flashDurationMs (10 000) to animate', () => {
      host.value = 'changed';
      fixture.detectChanges();
      const [, options] = animateSpy.calls.mostRecent().args;
      expect((options as KeyframeAnimationOptions).duration).toBe(DEFAULT_FLASH_DURATION_MS);
    });

    it('passes a custom flashDurationMs to animate', () => {
      host.duration = 3_000;
      fixture.detectChanges();
      host.value = 'changed';
      fixture.detectChanges();
      const [, options] = animateSpy.calls.mostRecent().args;
      expect((options as KeyframeAnimationOptions).duration).toBe(3_000);
    });

    it('clears the active-animation tracking after the animation finishes', fakeAsync(() => {
      host.value = 'changed';
      fixture.detectChanges();
      const firstAnimation = el.getAnimations()[0];

      // Drive the animation to its end and let onfinish fire.
      firstAnimation.finish();
      flushMicrotasks();

      // Trigger a fresh value change → directive must start a NEW animation,
      // not try to cancel a stale reference. Observable proof: the new
      // animation is a different Animation instance.
      host.value = 'changed-again';
      fixture.detectChanges();
      const animations = el.getAnimations();
      expect(animations.length).toBe(1);
      expect(animations[0]).not.toBe(firstAnimation);
    }));

    it('cancels the in-flight animation and starts a new one when the value changes mid-flash', () => {
      host.value = 'first-change';
      fixture.detectChanges();
      const firstAnimation = el.getAnimations()[0];
      expect(firstAnimation.playState).toBe('running');

      host.value = 'second-change';
      fixture.detectChanges();

      // First animation cancelled (playState 'idle'); a new one is active.
      expect(firstAnimation.playState).toBe('idle');
      const animations = el.getAnimations();
      expect(animations.length).toBe(1);
      expect(animations[0]).not.toBe(firstAnimation);
      expect(animateSpy).toHaveBeenCalledTimes(2);
    });

    it('treats falsy primitives (0, false, "") as real values, not "no value"', () => {
      // 'initial' → 0 — different → animate
      host.value = 0;
      fixture.detectChanges();
      expect(animateSpy).toHaveBeenCalledTimes(1);
      animateSpy.calls.reset();
      el.getAnimations().forEach((a) => a.cancel());

      // 0 → 0 — same → no animate
      host.value = 0;
      fixture.detectChanges();
      expect(animateSpy).not.toHaveBeenCalled();

      // 0 → false — different (Object.is(0, false) === false) → animate
      host.value = false;
      fixture.detectChanges();
      expect(animateSpy).toHaveBeenCalledTimes(1);
      animateSpy.calls.reset();
      el.getAnimations().forEach((a) => a.cancel());

      // false → false — same → no animate
      host.value = false;
      fixture.detectChanges();
      expect(animateSpy).not.toHaveBeenCalled();

      // false → '' — different → animate
      host.value = '';
      fixture.detectChanges();
      expect(animateSpy).toHaveBeenCalledTimes(1);
      animateSpy.calls.reset();
      el.getAnimations().forEach((a) => a.cancel());

      // '' → '' — same → no animate
      host.value = '';
      fixture.detectChanges();
      expect(animateSpy).not.toHaveBeenCalled();
    });

    it('treats NaN -> NaN as equal (Object.is) and does NOT animate', () => {
      host.value = NaN;
      fixture.detectChanges();
      expect(animateSpy).toHaveBeenCalledTimes(1);
      animateSpy.calls.reset();
      el.getAnimations().forEach((a) => a.cancel());

      // Angular's input-change check uses ===, so NaN !== NaN triggers ngOnChanges
      // again — but Object.is(NaN, NaN) === true, so the directive does NOT animate.
      host.value = NaN;
      fixture.detectChanges();
      expect(animateSpy).not.toHaveBeenCalled();
    });

    it('cancels in-flight work in ngOnDestroy and leaves no running animations', () => {
      host.value = 'changed';
      fixture.detectChanges();
      const animation = el.getAnimations()[0];
      expect(animation.playState).toBe('running');

      fixture.destroy();

      expect(animation.playState).toBe('idle');
      expect(el.getAnimations().length).toBe(0);
    });
  });

  describe('with prefers-reduced-motion: reduce', () => {
    let fixture: ComponentFixture<HostComponent>;
    let host: HostComponent;
    let el: HTMLElement;
    let animateSpy: jasmine.Spy;

    beforeEach(() => {
      // Stub matchMedia BEFORE the directive instantiates so its first
      // flash() call sees `matches: true`.
      spyOn(window, 'matchMedia').and.callFake((query: string) => ({
        matches: query === '(prefers-reduced-motion: reduce)',
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      } as MediaQueryList));

      TestBed.configureTestingModule({
        declarations: [HostComponent, CellFlashOnChangeWaapiDirective],
      });
      fixture = TestBed.createComponent(HostComponent);
      host = fixture.componentInstance;
      fixture.detectChanges();
      el = fixture.debugElement
        .query(By.directive(CellFlashOnChangeWaapiDirective))
        .nativeElement as HTMLElement;
      animateSpy = spyOn(el, 'animate').and.callThrough();
    });

    afterEach(() => {
      el.getAnimations().forEach((a) => a.cancel());
      fixture.destroy();
    });

    it('passes static-color keyframes (no fade) and linear easing when reduced-motion is on', () => {
      host.value = 'changed';
      fixture.detectChanges();
      const [keyframes, options] = animateSpy.calls.mostRecent().args;
      expect(keyframes).toEqual([
        { backgroundColor: FLASH_COLOR_RGBA },
        { backgroundColor: FLASH_COLOR_RGBA },
      ]);
      expect((options as KeyframeAnimationOptions).easing).toBe('linear');
    });
  });
});
