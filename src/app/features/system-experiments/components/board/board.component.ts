import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Pure layout primitive for one board (tab content).
 *
 *   ┌─ board (fills the active tab body inside the 1120 × 500 shell) ┐
 *   │  ┌─ body (two columns) ───────────────────────────────────┐    │
 *   │  │  ┌─ left ──────────┐                                  │    │
 *   │  │  │ CMD (`[boardCmd]`) │   GRID (`[boardGrid]`)        │    │
 *   │  │  │ ───────────────── │                                │    │
 *   │  │  │ FORM (`[boardForm]`)│                              │    │
 *   │  │  └─────────────────┘                                   │    │
 *   │  └────────────────────────────────────────────────────────┘    │
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
