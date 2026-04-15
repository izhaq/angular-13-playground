export interface GridRowDef {
  field: string;
  label: string;
}

export interface GridColumnDef {
  id: string;
  header: string;
}

export interface GridConfig {
  rows: GridRowDef[];
  columns: GridColumnDef[];
}

export interface CellValue {
  value: string;
  abbr: string;
}

export interface RowViewModel {
  field: string;
  label: string;
  cells: Record<string, CellValue>;
}

export interface FieldUpdate {
  field: string;
  cells: Record<string, CellValue>;
}
