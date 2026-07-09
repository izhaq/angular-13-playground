import { BehaviorSubject, Observable } from 'rxjs';
import { distinctUntilChanged } from 'rxjs/operators';

import { GridColId } from './ids';

/**
 * Per-board UI state shared between the detached column header
 * (`GridHeaderComponent`) and the scrolling body (`BoardRowsComponent`).
 *
 * After the header was extracted into its own component, the two pieces can no
 * longer share a local field, so column-level interactions are coordinated
 * through this small store:
 *   - **hover** (transient): hovering a header cell OR any data cell highlights
 *     the whole column (header cell + every data cell in it).
 *   - **selected** (pinned): clicking a header cell toggles a persistent
 *     highlight on the whole column.
 *
 * One instance per board (Primary / Secondary), created and owned by the shell
 * and passed to both components as an input. A plain class (not an Angular
 * service) so the shell can own two independent instances without
 * provider/projection-injector gymnastics; components consume the streams via
 * the `async` pipe, keeping OnPush correct with no manual subscriptions.
 */
export class ColumnHighlightStore {
  private readonly hoveredSubject = new BehaviorSubject<GridColId | null>(null);
  private readonly selectedSubject = new BehaviorSubject<GridColId | null>(null);

  readonly hovered$: Observable<GridColId | null> =
    this.hoveredSubject.pipe(distinctUntilChanged());
  readonly selected$: Observable<GridColId | null> =
    this.selectedSubject.pipe(distinctUntilChanged());

  get selected(): GridColId | null {
    return this.selectedSubject.value;
  }

  /** Set (or clear, with `null`) the transiently hovered column. */
  hover(colId: GridColId | null): void {
    this.hoveredSubject.next(colId);
  }

  /** Toggle the pinned column: click the active one again to clear it. */
  toggleSelect(colId: GridColId): void {
    this.selectedSubject.next(this.selectedSubject.value === colId ? null : colId);
  }
}
