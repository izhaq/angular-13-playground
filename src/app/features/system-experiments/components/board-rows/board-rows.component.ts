import {
  ChangeDetectionStrategy,
  Component,
  Input,
} from '@angular/core';
import { FormGroup } from '@angular/forms';

import { BoardId, GridColId } from '../../shared/ids';
import { FieldConfig, GridColumn, GridRow } from '../../shared/models';

/**
 * Unified form + grid renderer. One CSS Grid container holds:
 *
 *   [label] [control] [data-col-1] [data-col-2] ... [data-col-N]
 *
 * Every field is one row. Fields in `gridFields` get a label, a form
 * control, and N data cells filled from the matching `rows[fieldKey]`.
 * Fields in `formOnlyFields` (Primary's "Cmd to GS" subset) get only
 * label + control; the data area is filled with a spacer that forces a
 * line break in the auto-flow grid.
 *
 * Why merged: the previous split (PrimaryCommandsFormComponent +
 * StatusGridComponent in two side-by-side panes) duplicated row labels
 * and tied alignment to two independent components' SCSS staying
 * pixel-identical. One grid container = guaranteed alignment + zero
 * duplicate labels.
 */
@Component({
  selector: 'system-experiments-board-rows',
  templateUrl: './board-rows.component.html',
  styleUrls: ['./board-rows.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BoardRowsComponent {

  @Input() boardId!: BoardId;
  @Input() formGroup!: FormGroup;
  @Input() gridFields: FieldConfig[] = [];
  @Input() formOnlyFields: FieldConfig[] = [];
  @Input() columns: GridColumn[] = [];

  /**
   * Setter (rather than property) so we can pre-index by field key once
   * per emission instead of per template binding.
   */
  @Input() set rows(rows: GridRow[]) {
    this.rowByKey = new Map((rows ?? []).map((r) => [r.fieldKey, r]));
  }
  private rowByKey = new Map<string, GridRow>();

  hoveredColId: GridColId | null = null;
  /** Composite "{fieldKey}|{colId}" — null when nothing is selected. */
  selectedCellId: string | null = null;

  cellValue(fieldKey: string, colId: string): string {
    return this.rowByKey.get(fieldKey)?.values[colId] ?? '';
  }

  onEnterColumn(colId: GridColId): void {
    this.hoveredColId = colId;
  }

  onLeaveColumn(): void {
    this.hoveredColId = null;
  }

  onCellClick(fieldKey: string, colId: GridColId): void {
    this.selectedCellId = `${fieldKey}|${colId}`;
  }

  isSelected(fieldKey: string, colId: GridColId): boolean {
    return this.selectedCellId === `${fieldKey}|${colId}`;
  }

  readonly trackByColId = (_: number, col: GridColumn): GridColId => col.id as GridColId;
  readonly trackByFieldKey = (_: number, field: FieldConfig): string => field.key;
}
