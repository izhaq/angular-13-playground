import {
  Directive,
  ElementRef,
  Inject,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
} from '@angular/core';
import { DOCUMENT } from '@angular/common';

import {
  DEFAULT_FLASH_DURATION_MS,
  FLASH_COLOR_RGBA,
  FlashableValue,
} from './cell-flash-on-change.types';

/**
 * Cell Flash on Change — Version B: Web Animations API.
 *
 * Calls Element.animate() on a value change; the returned Animation handle
 * is stored so we can cancel it explicitly on mid-flash retrigger and on
 * destroy. No setTimeout — the browser owns the timing end-to-end.
 *
 * Element.animate is NOT patched by zone.js, so animation lifecycle
 * callbacks (onfinish) do not trigger Angular change detection. With 1k
 * cells flashing per WebSocket tick, that's zero CD overhead by
 * construction (no NgZone.runOutsideAngular ceremony needed).
 *
 * `prefers-reduced-motion` is checked fresh on every flash via
 * matchMedia — the user can toggle the OS setting between flashes and
 * the next flash respects the new value.
 *
 * `fill: 'none'` so that after the animation ends, the cell returns to
 * its natural CSS background-color (whatever a parent table/row provides).
 * This matches Version A's behavior where the class removal restores the
 * cell's natural style.
 *
 * Pairs with [appFlashOnChangeCss]; both ship together for evaluation
 * per ADR-1.
 */
@Directive({ selector: '[appFlashOnChangeWaapi]' })
export class CellFlashOnChangeWaapiDirective implements OnChanges, OnDestroy {
  @Input('appFlashOnChangeWaapi') value: FlashableValue = null;
  @Input() flashDurationMs: number = DEFAULT_FLASH_DURATION_MS;

  private hasSeenFirstValue = false;
  private currentAnimation: Animation | null = null;
  private readonly view: Window;

  constructor(
    private readonly host: ElementRef<HTMLElement>,
    @Inject(DOCUMENT) doc: Document,
  ) {
    // doc.defaultView is the Window in any normal browser-attached document.
    // Karma + Angular CLI guarantee this; the non-null assertion is safe.
    this.view = doc.defaultView!;
  }

  ngOnChanges(changes: SimpleChanges): void {
    const change = changes['value'];
    if (!change) return;

    if (!this.hasSeenFirstValue) {
      this.hasSeenFirstValue = true;
      return;
    }

    // Object.is — see CellFlashOnChangeCssDirective for the rationale.
    if (Object.is(change.previousValue, change.currentValue)) return;

    this.flash();
  }

  ngOnDestroy(): void {
    this.cancelCurrent();
  }

  private flash(): void {
    this.cancelCurrent();

    const reducedMotion = this.view.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Reduced-motion: identical start and end frames produce a constant
    // colored hold for the duration (no perceptible motion), then the
    // animation ends and the cell snaps back to its natural background.
    const keyframes: Keyframe[] = reducedMotion
      ? [{ backgroundColor: FLASH_COLOR_RGBA }, { backgroundColor: FLASH_COLOR_RGBA }]
      : [{ backgroundColor: FLASH_COLOR_RGBA }, { backgroundColor: 'transparent' }];

    const animation = this.host.nativeElement.animate(keyframes, {
      duration: this.flashDurationMs,
      easing: reducedMotion ? 'linear' : 'ease-out',
      fill: 'none',
    });

    animation.onfinish = () => {
      this.currentAnimation = null;
    };

    this.currentAnimation = animation;
  }

  private cancelCurrent(): void {
    if (this.currentAnimation) {
      this.currentAnimation.cancel();
      this.currentAnimation = null;
    }
  }
}
