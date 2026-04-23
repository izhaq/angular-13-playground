import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';

import { ENGINE_SIM_LABELS as L } from '../../shared/labels';
import { BoardId } from '../../shared/ids';

/**
 * Sticky footer for a board. Stateless: emits one event per button.
 * `boardId` is required so each button gets a globally-unique
 * `data-test-id` (footer-{boardId}-{action}) — Material tabs render
 * both tabs' DOM at once, so footer ids would otherwise collide.
 */
@Component({
  selector: 'engine-sim-board-footer',
  templateUrl: './board-footer.component.html',
  styleUrls: ['./board-footer.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BoardFooterComponent {
  @Input() boardId!: BoardId;
  @Input() disabled = false;

  @Output() readonly defaults = new EventEmitter<void>();
  @Output() readonly cancel = new EventEmitter<void>();
  @Output() readonly apply = new EventEmitter<void>();

  readonly labels = {
    defaults: L.defaults,
    cancel: L.cancel,
    apply: L.apply,
  };
}
