import {
  ChangeDetectionStrategy,
  Component,
  Input,
} from '@angular/core';

import { BoardId, GridColId } from '../../shared/ids';
import { GridColumn, GridRow } from '../../shared/models';

/**
 * Dumb, presentational read-only grid. Single CSS Grid container with one
 * extra leading column for the row labels (so total columns = `columns.length + 1`).
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
