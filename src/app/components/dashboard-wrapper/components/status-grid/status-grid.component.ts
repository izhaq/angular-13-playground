import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

import { GridConfig, RowViewModel } from './models/grid.models';

@Component({
  selector: 'app-status-grid',
  templateUrl: './status-grid.component.html',
  styleUrls: ['./status-grid.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatusGridComponent {
  @Input() config!: GridConfig;
  @Input() rows: RowViewModel[] = [];

  hoveredColumnId: string | null = null;
  hoveredCell: { field: string; columnId: string } | null = null;
  focusedCell: { field: string; columnId: string } | null = null;

  trackByField(_index: number, row: RowViewModel): string {
    return row.field;
  }

  trackByColumnId(_index: number, col: { id: string }): string {
    return col.id;
  }

  onColumnHover(columnId: string | null): void {
    this.hoveredColumnId = columnId;
  }

  onCellHover(field: string | null, columnId: string | null): void {
    this.hoveredCell = field && columnId ? { field, columnId } : null;
    this.hoveredColumnId = columnId;
  }

  onCellClick(field: string, columnId: string): void {
    if (this.focusedCell?.field === field && this.focusedCell?.columnId === columnId) {
      this.focusedCell = null;
    } else {
      this.focusedCell = { field, columnId };
    }
  }

  isColumnHovered(columnId: string): boolean {
    return this.hoveredColumnId === columnId;
  }

  isCellHovered(field: string, columnId: string): boolean {
    return this.hoveredCell?.field === field && this.hoveredCell?.columnId === columnId;
  }

  isCellFocused(field: string, columnId: string): boolean {
    return this.focusedCell?.field === field && this.focusedCell?.columnId === columnId;
  }
}
