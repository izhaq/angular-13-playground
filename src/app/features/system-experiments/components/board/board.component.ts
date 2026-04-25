import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Pure layout primitive for one board (tab content).
 *
 * Structure:
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
 * The board is purely the per-tab content surface. The action bar
 * (Defaults / Cancel / Apply) lives one level up on the shell as a
 * SINGLE shared `BoardFooterComponent` outside the `mat-tab-group` —
 * its disabled state and dispatch are identical for both tabs, so
 * splitting it per board would be redundant. Keeping the footer out
 * of the board also lets this layout primitive stay a pure 3-slot
 * surface (cmd / form / grid).
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
  selector: 'system-experiments-board',
  templateUrl: './board.component.html',
  styleUrls: ['./board.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BoardComponent {}
