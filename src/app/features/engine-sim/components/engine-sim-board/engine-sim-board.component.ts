import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Pure layout primitive for one board (tab content).
 *
 * Structure:
 *
 *   ┌─ engine-sim-board (flex column, fills the 1150 × 550 shell) ─┐
 *   │  CMD (fixed top — `[boardCmd]`)                              │
 *   │  ┌─ body (scrollable middle, two columns) ────────────────┐ │
 *   │  │  FORM (`[boardForm]`)    │   GRID (`[boardGrid]`)      │ │
 *   │  └────────────────────────────────────────────────────────┘ │
 *   │  FOOTER (fixed bottom — `[boardFooter]`)                     │
 *   └──────────────────────────────────────────────────────────────┘
 *
 * The board has zero inputs, zero outputs, zero logic. It is content
 * projection + layout SCSS only. The shell wires data/events directly
 * to the projected children — `[disabled]` flows from the shell to
 * `<primary-commands-form [disabled]="…" boardForm>`, not through here.
 *
 * Slot markers use plain attribute selectors (`[boardCmd]` etc.) so
 * consumers can attach them to any element or component without coupling
 * the layout to a specific child component class.
 */
@Component({
  selector: 'engine-sim-board',
  templateUrl: './engine-sim-board.component.html',
  styleUrls: ['./engine-sim-board.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EngineSimBoardComponent {}
