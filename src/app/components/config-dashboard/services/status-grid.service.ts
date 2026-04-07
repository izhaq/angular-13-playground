import { Injectable } from '@angular/core';
import { BehaviorSubject, Subscription } from 'rxjs';
import { buildInitialGridRows } from '../models/dashboard-defaults';
import {
  CellViewModel,
  FieldUpdate,
  GridColumn,
  GridRow,
  RowViewModel,
} from '../models/grid.models';
import { GRID_COLUMNS } from '../../../mocks/mock-data';

const DEFAULT_BG = '#ffffff';

@Injectable({
  providedIn: 'root',
})
export class StatusGridService {
  private readonly columns: GridColumn[] = GRID_COLUMNS;
  private rawRows: GridRow[] = buildInitialGridRows(this.columns);

  private readonly viewModelSubject = new BehaviorSubject<RowViewModel[]>(
    this.buildViewModels(this.rawRows)
  );
  private connectionSub: Subscription | null = null;

  readonly gridRows$ = this.viewModelSubject.asObservable();

  get columnCount(): number {
    return this.columns.length;
  }

  get cellColumnsTemplate(): string {
    const n = this.columns.length;
    return n > 0 ? `repeat(${n}, minmax(2.5em, 1fr))` : '';
  }

  applyUpdate(update: FieldUpdate): void {
    this.rawRows = this.rawRows.map((row) => {
      if (row.field !== update.field) {
        return row;
      }

      const newRow = { ...row };

      if (update.value !== undefined) {
        newRow.confirmedValue = update.value;
      }

      if (update.statuses) {
        newRow.cells = row.cells.map((cell) => {
          if (update.statuses!.hasOwnProperty(cell.columnId)) {
            return { ...cell, active: update.statuses![cell.columnId] };
          }
          return cell;
        });
      }

      return newRow;
    });

    this.viewModelSubject.next(this.buildViewModels(this.rawRows));
  }

  connect(): void {
    const mockUpdates: FieldUpdate[] = [
      { field: 'operations.opr1', value: 'Option 2', statuses: { red: true, green: false, yellow: false, n: true, p: false, l: false } },
      { field: 'operations.opr2', value: 'Option 3', statuses: { red: false, green: true, yellow: false, n: false, p: true, l: false } },
      { field: 'operations.opr3', value: 'Option 1', statuses: { red: false, green: true, yellow: true, n: false, p: false, l: true } },
      { field: 'operations.opr4', value: 'Option 4', statuses: { red: true, green: false, yellow: true, n: true, p: true, l: false } },
      { field: 'operations.opr5', value: 'Option 2', statuses: { red: false, green: false, yellow: false, n: false, p: false, l: true } },
      { field: 'operations.opr6', value: 'Option 1', statuses: { red: false, green: true, yellow: false, n: true, p: false, l: false } },
      { field: 'operations.opr7', value: 'Option 3', statuses: { red: true, green: false, yellow: true, n: false, p: true, l: true } },
      { field: 'operations.opr8', value: 'Option 2', statuses: { red: false, green: true, yellow: false, n: false, p: false, l: false } },
      { field: 'operations.opr9', value: 'Option 4', statuses: { red: true, green: true, yellow: false, n: true, p: true, l: true } },
      { field: 'operations.opr10', value: 'Option 1', statuses: { red: false, green: false, yellow: true, n: false, p: true, l: false } },
    ];

    mockUpdates.forEach((update) => this.applyUpdate(update));
  }

  disconnect(): void {
    this.connectionSub?.unsubscribe();
    this.connectionSub = null;
  }

  resetToDefaults(): void {
    this.rawRows = buildInitialGridRows(this.columns);
    this.viewModelSubject.next(this.buildViewModels(this.rawRows));
  }

  private buildViewModels(rows: GridRow[]): RowViewModel[] {
    return rows.map((row) => ({
      field: row.field,
      label: row.label,
      confirmedValue: row.confirmedValue,
      cells: row.cells.map((cell, i) => this.buildCellViewModel(cell, i)),
    }));
  }

  private buildCellViewModel(cell: { columnId: string; active: boolean }, index: number): CellViewModel {
    const col = this.columns[index];
    const isActiveColor = cell.active && col?.type === 'color';
    const isActiveText = cell.active && col?.type === 'text';

    return {
      columnId: cell.columnId,
      active: cell.active,
      backgroundColor: isActiveColor ? (col.color ?? DEFAULT_BG) : DEFAULT_BG,
      textLabel: isActiveText ? col.label : '',
      showText: isActiveText,
    };
  }
}
