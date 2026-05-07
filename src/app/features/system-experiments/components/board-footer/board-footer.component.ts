import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';

import { SYSTEM_EXPERIMENTS_LABELS as L } from '../../shared/labels';

/**
 * Identifies which footer button is currently in flight. `null` means no
 * call is pending. The footer is single-flight by design — Apply and
 * Defaults are mutually exclusive at the shell level — so one identifier
 * is enough to drive both spinner placement and the cross-button disable.
 */
export type FooterLoadingButton = 'apply' | 'defaults' | null;

/**
 * Sticky footer for the dashboard. Stateless: emits one event per button.
 *
 * Disable surface area:
 *   - `disabled`      → kills ALL three buttons (used for live mode).
 *   - `applyDisabled` → additive, kills ONLY Apply (CMD scope incomplete).
 *   - `loading`       → 'apply' | 'defaults' renders the spinner on the
 *                       matching button AND disables the OTHER footer
 *                       buttons too — no concurrent footer actions.
 */
@Component({
  selector: 'system-experiments-board-footer',
  templateUrl: './board-footer.component.html',
  styleUrls: ['./board-footer.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BoardFooterComponent {
  @Input() disabled = false;
  @Input() applyDisabled = false;
  @Input() loading: FooterLoadingButton = null;

  @Output() readonly defaults = new EventEmitter<void>();
  @Output() readonly cancel = new EventEmitter<void>();
  @Output() readonly apply = new EventEmitter<void>();

  readonly labels = {
    defaults: L.defaults,
    cancel: L.cancel,
    apply: L.apply,
  };

  /** True iff ANY footer button is currently in flight. */
  get anyLoading(): boolean {
    return this.loading !== null;
  }
}
