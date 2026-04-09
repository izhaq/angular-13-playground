import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Observable } from 'rxjs';

import { CellViewModel, RowViewModel } from '../../models/grid.models';
import { StatusGridService } from '../../services/status-grid.service';

@Component({
  selector: 'app-status-grid',
  templateUrl: './status-grid.component.html',
  styleUrls: ['./status-grid.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatusGridComponent {
  readonly headerColumns: number[];
  readonly gridRows$: Observable<RowViewModel[]>;

  constructor(private readonly gridService: StatusGridService) {
    this.headerColumns = Array.from({ length: this.gridService.columnCount }, (_, i) => i);
    this.gridRows$ = this.gridService.gridRows$;
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
