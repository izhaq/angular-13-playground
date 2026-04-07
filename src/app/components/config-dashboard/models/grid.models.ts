export interface GridCell {
  columnId: string;
  active: boolean;
}

export interface GridRow {
  field: string;
  label: string;
  confirmedValue: string;
  cells: GridCell[];
}

export interface GridColumn {
  id: string;
  label: string;
  type: 'color' | 'text';
  color?: string;
}

export interface GridConfig {
  columns: GridColumn[];
}

export interface FieldUpdate {
  field: string;
  value?: string;
  statuses?: Record<string, boolean>;
}

export interface CellViewModel {
  columnId: string;
  active: boolean;
  backgroundColor: string;
  textLabel: string;
  showText: boolean;
}

export interface RowViewModel {
  field: string;
  label: string;
  confirmedValue: string;
  cells: CellViewModel[];
}
