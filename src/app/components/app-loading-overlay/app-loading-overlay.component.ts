import {
  ChangeDetectionStrategy,
  Component,
  HostBinding,
  Input,
} from '@angular/core';

/**
 * Reusable in-flight overlay. Wraps any projected content (button,
 * dropdown, etc.) and, while `loading` is true, renders an absolutely
 * positioned shade with a pure-CSS spinner on top. The shade also
 * blocks pointer events so the wrapped control cannot be re-triggered
 * mid-flight.
 *
 * Intentionally agnostic — no domain prefix in the selector and no
 * coupling to the host's chrome — so it can be reused across features.
 */
@Component({
  selector: 'app-loading-overlay',
  templateUrl: './app-loading-overlay.component.html',
  styleUrls: ['./app-loading-overlay.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppLoadingOverlayComponent {
  @Input() loading = false;
  /** Optional `data-test-id` for the spinner element. Empty string = no attr. */
  @Input() spinnerTestId = '';

  @HostBinding('class.is-loading')
  get hostLoadingClass(): boolean {
    return this.loading;
  }

  @HostBinding('attr.aria-busy')
  get ariaBusy(): string | null {
    return this.loading ? 'true' : null;
  }
}
