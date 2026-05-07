import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Pure layout primitive for one board (tab content).
 *
 *   ┌─ board (fills the active tab body inside the 1120 × 500 shell) ┐
 *   │  CMD  (`[boardCmd]`)                                           │
 *   │  ────────────────────────────────────────────────────────────  │
 *   │  ROWS (`[boardRows]`) — unified form + grid in one CSS grid    │
 *   └────────────────────────────────────────────────────────────────┘
 *
 * Zero inputs / outputs — content projection + layout SCSS only.
 */
@Component({
  selector: 'system-experiments-board',
  templateUrl: './board.component.html',
  styleUrls: ['./board.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BoardComponent {}
