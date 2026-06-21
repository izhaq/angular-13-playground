import {
  ChangeDetectionStrategy,
  Component,
  Input,
} from '@angular/core';

import { BoardId, GridColId } from '../../shared/ids';
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
 * Column hover/selection sync with the body is intentionally NOT handled here
 * (deferred to a dedicated follow-up — see the feature brief). This strip is
 * static labels only.
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

  readonly trackByColId = (_: number, col: GridColumn): GridColId => col.id as GridColId;
}
