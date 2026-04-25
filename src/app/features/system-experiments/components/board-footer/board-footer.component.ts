import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';

import { SYSTEM_EXPERIMENTS_LABELS as L } from '../../shared/labels';
import { BoardId } from '../../shared/ids';

/**
 * Sticky footer for a board. Stateless: emits one event per button.
 * `boardId` is required so each button gets a globally-unique
 * `data-test-id` (footer-{boardId}-{action}) — Material tabs render
 * both tabs' DOM at once, so footer ids would otherwise collide.
 *
 * Disable surface area:
 *   - `disabled`      → kills ALL three buttons (used for live mode).
 *   - `applyDisabled` → additive, kills ONLY Apply (used when CMD scope
 *                       is incomplete: sending a POST without a side or
 *                       wheel would no-op on the server). Defaults +
 *                       Cancel intentionally stay enabled — they edit
 *                       the form locally and never reach the network.
 */
@Component({
  selector: 'system-experiments-board-footer',
  templateUrl: './board-footer.component.html',
  styleUrls: ['./board-footer.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BoardFooterComponent {
  @Input() boardId!: BoardId;
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
