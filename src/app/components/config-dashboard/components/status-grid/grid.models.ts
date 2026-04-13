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

export interface RowViewModel {
  field: string;
  label: string;
  cells: Record<string, string>;
}

export interface FieldUpdate {
  field: string;
  cells: Record<string, string>;
}
