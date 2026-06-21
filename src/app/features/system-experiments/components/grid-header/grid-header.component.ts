import {
  ChangeDetectionStrategy,
  Component,
  Input,
} from '@angular/core';

import { BoardId, GridColId } from '../../shared/ids';
import { ColumnHighlightStore } from '../../shared/column-highlight.store';
import { GridColumn } from '../../shared/models';

/**
 * Static column-header strip, extracted from `BoardRowsComponent` so it can
 * live on the sticky CMD band instead of scrolling away with the data.
 *
 * Renders only the DATA columns (`L1…GDL`) — the label/control area to its
 * left is occupied by the CMD section on the same line. The component is a
 * grid of `--data-col-count` equal `minmax(0, 1fr)` columns; placed in the
 * board's sticky band beside CMD, its columns line up with the scrolling
 * body's data columns because both divide the same data-area width into the
 * same number of equal tracks (see `board.component.scss`).
 *
 * Column hover/selection is coordinated with the scrolling body through the
 * shared `ColumnHighlightStore` (one instance per board, owned by the shell):
 * hovering a header cell highlights the whole column, and clicking a header
 * cell toggles a pinned highlight on it. The store streams are consumed via
 * the `async` pipe so OnPush stays correct without manual subscriptions.
 */
@Component({
  selector: 'system-experiments-grid-header',
  templateUrl: './grid-header.component.html',
  styleUrls: ['./grid-header.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GridHeaderComponent {
  @Input() boardId!: BoardId;
  @Input() columns: GridColumn[] = [];

  /**
   * Shared per-board hover/selection state. Defaulted so the component renders
   * standalone (e.g. in isolation tests); the shell supplies the instance that
   * is shared with the matching `BoardRowsComponent`.
   */
  @Input() highlight: ColumnHighlightStore = new ColumnHighlightStore();

  onEnterColumn(colId: GridColId): void {
    this.highlight.hover(colId);
  }

  onLeaveColumn(): void {
    this.highlight.hover(null);
  }

  onHeaderClick(colId: GridColId): void {
    this.highlight.toggleSelect(colId);
  }

  readonly trackByColId = (_: number, col: GridColumn): GridColId => col.id as GridColId;
}
