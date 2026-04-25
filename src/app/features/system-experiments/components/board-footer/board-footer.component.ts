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
 * Single-instance design: the shell mounts ONE footer outside the
 * `mat-tab-group` and dispatches its events to the active board's
 * handler (see `SystemExperimentsShellComponent.onActive*`). Material
 * lazy-renders only the active tab, so per-tab footers would have been
 * functionally redundant — same disabled state, same labels, just
 * different handler routes — and visually competed with the board's
 * own envelope. Pulling the footer out also keeps `BoardComponent` a
 * pure 3-slot layout (cmd / form / grid) instead of leaking action-bar
 * concerns into the layout primitive.
 *
 * Test-id naming: `footer-{action}` (no board namespace). The footer is
 * a singleton; namespacing was only ever defensive against simultaneous
 * mounting that doesn't happen.
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
