import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { FieldUpdate, GridColumnDef, GridRowDef, RowViewModel } from '../models/grid.models';
import { buildInitialGridRows } from '../models/grid-defaults';

@Injectable()
export class StatusGridService {
  private columns: GridColumnDef[] = [];
  private rowDefs: GridRowDef[] = [];
  private rows: RowViewModel[] = [];

  private readonly rowsSubject = new BehaviorSubject<RowViewModel[]>(this.rows);

  readonly gridRows$ = this.rowsSubject.asObservable();

  get columnCount(): number {
    return this.columns.length;
  }

  configure(columns: GridColumnDef[], rowDefs: GridRowDef[]): void {
    this.columns = columns;
    this.rowDefs = rowDefs;
    this.rows = buildInitialGridRows(this.columns, this.rowDefs);
    this.rowsSubject.next(this.rows);
  }

  applyUpdate(update: FieldUpdate): void {
    const index = this.rows.findIndex(r => r.field === update.field);
    if (index === -1) {
      return;
    }

    const row = this.rows[index];
    this.rows = [
      ...this.rows.slice(0, index),
      {
        ...row,
        cells: { ...row.cells, ...update.cells },
      },
      ...this.rows.slice(index + 1),
    ];

    this.rowsSubject.next(this.rows);
  }

  resetToDefaults(): void {
    this.rows = buildInitialGridRows(this.columns, this.rowDefs);
    this.rowsSubject.next(this.rows);
  }
}
