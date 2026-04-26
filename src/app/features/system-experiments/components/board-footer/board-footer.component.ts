import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';

import { SYSTEM_EXPERIMENTS_LABELS as L } from '../../shared/labels';

/**
 * Sticky footer for the dashboard. Stateless: emits one event per button.
 *
 * Disable surface area:
 *   - `disabled`      → kills ALL three buttons (used for live mode).
 *   - `applyDisabled` → additive, kills ONLY Apply (CMD scope incomplete:
 *                       Defaults + Cancel stay enabled because they edit
 *                       the form locally and never reach the network).
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

  @Output() readonly defaults = new EventEmitter<void>();
  @Output() readonly cancel = new EventEmitter<void>();
  @Output() readonly apply = new EventEmitter<void>();

  readonly labels = {
    defaults: L.defaults,
    cancel: L.cancel,
    apply: L.apply,
  };
}
