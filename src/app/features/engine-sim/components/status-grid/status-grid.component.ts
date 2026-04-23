import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit,
} from '@angular/core';

import { BoardId } from '../../shared/board-ids';
import { GridColId } from '../../shared/column-ids';
import { GridColumn, GridRow } from '../../shared/engine-sim.models';

/**
 * Dumb, presentational read-only grid. Data shape is dictated by the
 * `GridColumn[]` + `GridRow[]` inputs the shell precomputes from the
 * WebSocket stream — no fetching, no transforms, no board-specific code.
 *
 * Layout: a single CSS Grid container with one extra leading column for
 * the row labels (so total columns = `columns.length + 1`).
 *
 * Local UI state:
 *   - `hoveredColId`  — column-wide highlight on cell mouseenter
 *   - `selectedCellId` — last clicked cell ("fieldKey|colId")
 *
 * All clickable elements expose namespaced `data-test-id`s so Playwright
 * can target a specific board's grid even when both boards are mounted
 * simultaneously by Material tabs.
 */
@Component({
  selector: 'engine-sim-status-grid',
  templateUrl: './status-grid.component.html',
  styleUrls: ['./status-grid.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatusGridComponent implements OnInit {
  @Input() boardId!: BoardId;
  @Input() columns: GridColumn[] = [];
  @Input() rows: GridRow[] = [];

  /**
   * Precomputed once at init (avoids recalculation per change-detection
   * tick — relevant since OnPush still runs CD on event handlers).
   * `columns` is treated as set-once: each board hands the grid a static
   * `GridColumn[]` constant. If columns ever become reactive, switch to
   * `ngOnChanges` so the track template stays in sync.
   */
  gridTemplateColumns = '';

  hoveredColId: GridColId | null = null;
  /** Composite id "{fieldKey}|{colId}" — null when nothing is selected. */
  selectedCellId: string | null = null;

  ngOnInit(): void {
    // Cell minimums come from `--grid-label-col-min` / `--grid-data-col-min`,
    // which the host's SCSS exposes (see status-grid.component.scss). Keeping
    // the literals out of TS means changing the sizing budget is a one-line
    // edit in this component's SCSS.
    this.gridTemplateColumns =
      'minmax(var(--grid-label-col-min), max-content) ' +
      `repeat(${this.columns.length}, minmax(var(--grid-data-col-min), 1fr))`;
  }

  onEnterColumn(colId: GridColId): void {
    this.hoveredColId = colId;
  }

  onLeaveColumn(): void {
    this.hoveredColId = null;
  }

  onCellClick(fieldKey: string, colId: GridColId): void {
    this.selectedCellId = `${fieldKey}|${colId}`;
  }

  isSelected(fieldKey: string, colId: GridColId): boolean {
    return this.selectedCellId === `${fieldKey}|${colId}`;
  }

  readonly trackByColId = (_: number, col: GridColumn): GridColId => col.id as GridColId;
  readonly trackByFieldKey = (_: number, row: GridRow): string => row.fieldKey;
}
