import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { AbbrLookup } from './abbr-lookup';
import { FieldUpdate, GridColumnDef, GridRowDef, RowViewModel } from './grid.models';
import { buildInitialGridRows } from './grid-defaults';

@Injectable()
export class StatusGridService {
  private columns: GridColumnDef[] = [];
  private rowDefs: GridRowDef[] = [];
  private abbrLookup: AbbrLookup = {};
  private rows: RowViewModel[] = [];

  private readonly rowsSubject = new BehaviorSubject<RowViewModel[]>(this.rows);

  readonly gridRows$ = this.rowsSubject.asObservable();

  get columnCount(): number {
    return this.columns.length;
  }

  configure(columns: GridColumnDef[], abbrLookup: AbbrLookup, rowDefs: GridRowDef[]): void {
    this.columns = columns;
    this.rowDefs = rowDefs;
    this.abbrLookup = abbrLookup;
    this.rows = buildInitialGridRows(this.columns, this.rowDefs);
    this.rowsSubject.next(this.rows);
  }

  applyUpdate(update: FieldUpdate): void {
    const index = this.rows.findIndex(r => r.field === update.field);
    if (index === -1) {
      return;
    }

    const resolvedCells: Record<string, string> = {};
    const fieldMap = this.abbrLookup[update.field];

    for (const [colId, rawValue] of Object.entries(update.cells)) {
      resolvedCells[colId] = this.resolveAbbr(rawValue, fieldMap);
    }

    const row = this.rows[index];
    this.rows = [
      ...this.rows.slice(0, index),
      {
        ...row,
        cells: { ...row.cells, ...resolvedCells },
      },
      ...this.rows.slice(index + 1),
    ];

    this.rowsSubject.next(this.rows);
  }

  resetToDefaults(): void {
    this.rows = buildInitialGridRows(this.columns, this.rowDefs);
    this.rowsSubject.next(this.rows);
  }

  private resolveAbbr(rawValue: string, fieldMap?: Record<string, string>): string {
    if (!fieldMap) {
      return rawValue;
    }

    if (rawValue.includes(',')) {
      return rawValue
        .split(',')
        .map(part => part.trim())
        .filter(Boolean)
        .map(part => fieldMap[part] ?? part)
        .join(',');
    }

    return fieldMap[rawValue] ?? rawValue;
  }
}
