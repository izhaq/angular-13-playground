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

  applyUpdate(update: FieldUpdate): void {
    const index = this.rawRows.findIndex(r => r.field === update.field);
    if (index === -1) {
      return;
    }

    const row = this.rawRows[index];
    const updatedRow: GridRow = {
      ...row,
      confirmedValue: update.value ?? row.confirmedValue,
      cells: update.statuses
        ? row.cells.map(cell => ({
            ...cell,
            active: update.statuses![cell.columnId] ?? cell.active,
          }))
        : row.cells,
    };

    this.rawRows = [
      ...this.rawRows.slice(0, index),
      updatedRow,
      ...this.rawRows.slice(index + 1),
    ];

    this.viewModelSubject.next(this.buildViewModels(this.rawRows));
  }

  connect(): void {
    const mockUpdates: FieldUpdate[] = [
      { field: 'vehicleControls.terrain', value: 'Gravel, Sand', statuses: { red: true, green: false, yellow: false, n: true, p: false, l: false } },
      { field: 'vehicleControls.weather', value: 'Rain, Fog', statuses: { red: false, green: true, yellow: false, n: false, p: true, l: false } },
      { field: 'vehicleControls.speedLimit', value: '120 km/h', statuses: { red: false, green: true, yellow: true, n: false, p: false, l: true } },
      { field: 'vehicleControls.gear', value: 'D', statuses: { red: true, green: false, yellow: true, n: true, p: true, l: false } },
      { field: 'vehicleControls.headlights', value: 'Auto', statuses: { red: false, green: false, yellow: false, n: false, p: false, l: true } },
      { field: 'vehicleControls.wipers', value: 'Interval', statuses: { red: false, green: true, yellow: false, n: true, p: false, l: false } },
      { field: 'vehicleControls.tractionCtrl', value: 'Sport', statuses: { red: true, green: false, yellow: true, n: false, p: true, l: true } },
      { field: 'vehicleControls.stability', value: 'ESC Off', statuses: { red: false, green: true, yellow: false, n: false, p: false, l: false } },
      { field: 'vehicleControls.cruiseCtrl', value: 'Adaptive', statuses: { red: true, green: true, yellow: false, n: true, p: true, l: true } },
      { field: 'vehicleControls.brakeAssist', value: 'Full Assist', statuses: { red: false, green: false, yellow: true, n: false, p: true, l: false } },
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
