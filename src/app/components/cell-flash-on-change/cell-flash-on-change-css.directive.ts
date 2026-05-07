import {
  Directive,
  ElementRef,
  Input,
  NgZone,
  OnChanges,
  OnDestroy,
  Renderer2,
  SimpleChanges,
} from '@angular/core';

import {
  DEFAULT_FLASH_DURATION_MS,
  FLASH_CLASS,
  FlashableValue,
} from './cell-flash-on-change.types';

/**
 * Cell Flash on Change — Version A: CSS @keyframes + setTimeout.
 *
 * Adds a class to the host element on a value change; the class triggers a
 * CSS @keyframes fade defined in src/styles/_cell-flash-on-change.scss.
 * Removes the class after `flashDurationMs` via a single setTimeout.
 *
 * The setTimeout is wrapped in `NgZone.runOutsideAngular` so its callback
 * does NOT trigger change detection — with 1k cells flashing per WebSocket
 * tick, that's the difference between 0 and 1k unnecessary CD ticks per
 * fade cycle. See specs/cell-flash-on-change/plan.md ADR-5.
 *
 * Pairs with [appFlashOnChangeWaapi] (Web Animations API variant); both
 * ship together for evaluation per ADR-1.
 */
@Directive({ selector: '[appFlashOnChangeCss]' })
export class CellFlashOnChangeCssDirective implements OnChanges, OnDestroy {
  @Input('appFlashOnChangeCss') value: FlashableValue = null;
  @Input() flashDurationMs: number = DEFAULT_FLASH_DURATION_MS;

  private hasSeenFirstValue = false;
  private removeClassTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly host: ElementRef<HTMLElement>,
    private readonly renderer: Renderer2,
    private readonly zone: NgZone,
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    const change = changes['value'];
    if (!change) return;

    if (!this.hasSeenFirstValue) {
      this.hasSeenFirstValue = true;
      return;
    }

    // Object.is treats NaN/NaN as equal — semantically correct for
    // "did the value actually change". For all other primitives, identical to ===.
    if (Object.is(change.previousValue, change.currentValue)) return;

    this.flash();
  }

  ngOnDestroy(): void {
    this.cancelPendingTimer();
  }

  private flash(): void {
    const el = this.host.nativeElement;
    this.cancelPendingTimer();

    // Restart cleanly: remove class, force reflow, re-add class.
    // The `void el.offsetWidth` is load-bearing — it forces a synchronous
    // reflow so the @keyframes restarts from frame 0 instead of the browser
    // collapsing remove+add into a no-op within the same tick.
    this.renderer.removeClass(el, FLASH_CLASS);
    void el.offsetWidth;
    this.renderer.setStyle(el, 'animation-duration', `${this.flashDurationMs}ms`);
    this.renderer.addClass(el, FLASH_CLASS);

    this.zone.runOutsideAngular(() => {
      this.removeClassTimer = setTimeout(() => {
        this.renderer.removeClass(el, FLASH_CLASS);
        this.removeClassTimer = null;
      }, this.flashDurationMs);
    });
  }

  private cancelPendingTimer(): void {
    if (this.removeClassTimer !== null) {
      clearTimeout(this.removeClassTimer);
      this.removeClassTimer = null;
    }
  }
}
