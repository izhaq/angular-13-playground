import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

import { CellViewModel, RowViewModel } from '../../models/grid.models';

@Component({
  selector: 'app-status-grid',
  templateUrl: './status-grid.component.html',
  styleUrls: ['./status-grid.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatusGridComponent {
  @Input() cellColumnsTemplate = '';
  @Input() columnCount = 0;
  @Input() gridRows: RowViewModel[] = [];

  get headerColumns(): number[] {
    return Array.from({ length: this.columnCount }, (_, i) => i);
  }

  trackByField(_index: number, row: RowViewModel): string {
    return row.field;
  }

  trackByIndex(index: number): number {
    return index;
  }

  trackByCellColumnId(_index: number, cell: CellViewModel): string {
    return cell.columnId;
  }
}
