import {
  ChangeDetectionStrategy,
  Component,
  Input,
} from '@angular/core';

import { BoardId, GridColId } from '../../shared/ids';
import { GridColumn, GridRow } from '../../shared/models';

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
  selector: 'system-experiments-status-grid',
  templateUrl: './status-grid.component.html',
  styleUrls: ['./status-grid.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatusGridComponent {
  @Input() boardId!: BoardId;
  @Input() columns: GridColumn[] = [];
  @Input() rows: GridRow[] = [];

  hoveredColId: GridColId | null = null;
  /** Composite id "{fieldKey}|{colId}" — null when nothing is selected. */
  selectedCellId: string | null = null;

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
