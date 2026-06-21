import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { GridHeaderComponent } from './grid-header.component';
import { BOARD_IDS, COL_IDS } from '../../shared/ids';
import { GridColumn } from '../../shared/models';

/**
 * GridHeaderComponent is the static column-header strip extracted from
 * BoardRowsComponent. Contract this spec pins:
 *   - one header cell per column, in order
 *   - cell text is the column label
 *   - legacy E2E test id preserved: `grid-header-{boardId}-{colId}`
 *   - `--data-col-count` exposed on the grid so its tracks match the body
 *   - the first cell is flagged so it can carry the left border
 *   - column highlight via the shared `ColumnHighlightStore`: hover tints the
 *     column, click pins it (toggle), and an externally-set pin is reflected
 *     (the body sets the same store)
 */
describe('GridHeaderComponent', () => {
  let fixture: ComponentFixture<GridHeaderComponent>;
  let component: GridHeaderComponent;

  const columns: GridColumn[] = [
    { id: COL_IDS.left[0],  label: 'L1' },
    { id: COL_IDS.left[1],  label: 'L2' },
    { id: COL_IDS.right[0], label: 'R1' },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [GridHeaderComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(GridHeaderComponent);
    component = fixture.componentInstance;
    component.boardId = BOARD_IDS.primary;
    component.columns = columns;
    fixture.detectChanges();
  });

  it('renders one header cell per column, in order, with the legacy test id and label', () => {
    columns.forEach((col) => {
      const cell = fixture.debugElement.query(
        By.css(`[data-test-id="grid-header-${component.boardId}-${col.id}"]`),
      );
      expect(cell).withContext(`expected header for ${col.id}`).not.toBeNull();
      expect(cell.nativeElement.textContent.trim()).toBe(col.label);
    });

    const cells = fixture.debugElement.queryAll(By.css('.grid-header__cell'));
    expect(cells.length).toBe(columns.length);
  });

  it('exposes the data-column count as a CSS var so tracks match the body', () => {
    const grid = fixture.debugElement.query(By.css('.grid-header'));
    expect(grid.nativeElement.style.getPropertyValue('--data-col-count'))
      .toBe(String(columns.length));
  });

  it('flags only the first cell (for the left border)', () => {
    const cells = fixture.debugElement.queryAll(By.css('.grid-header__cell'));
    expect(cells[0].nativeElement.classList).toContain('grid-header__cell--first');
    expect(cells[1].nativeElement.classList).not.toContain('grid-header__cell--first');
  });

  // ---------------------------------------------------------------------------
  // Column highlight (shared ColumnHighlightStore)
  // ---------------------------------------------------------------------------

  function headerCell(colId: string) {
    return fixture.debugElement.query(
      By.css(`[data-test-id="grid-header-${component.boardId}-${colId}"]`),
    );
  }

  it('hovering a header cell tints that column and clears on leave', () => {
    const cell = headerCell(columns[1].id);

    cell.triggerEventHandler('mouseenter', null);
    fixture.detectChanges();
    expect(cell.nativeElement.classList).toContain('grid-header__cell--col-hovered');

    cell.triggerEventHandler('mouseleave', null);
    fixture.detectChanges();
    expect(cell.nativeElement.classList).not.toContain('grid-header__cell--col-hovered');
  });

  it('clicking a header cell pins the column; clicking again clears it', () => {
    const cell = headerCell(columns[0].id);

    cell.triggerEventHandler('click', null);
    fixture.detectChanges();
    expect(cell.nativeElement.classList).toContain('grid-header__cell--col-selected');
    expect(component.highlight.selected).toBe(columns[0].id);

    cell.triggerEventHandler('click', null);
    fixture.detectChanges();
    expect(cell.nativeElement.classList).not.toContain('grid-header__cell--col-selected');
    expect(component.highlight.selected).toBeNull();
  });

  it('clicking a different header moves the pinned column', () => {
    headerCell(columns[0].id).triggerEventHandler('click', null);
    headerCell(columns[1].id).triggerEventHandler('click', null);
    fixture.detectChanges();

    expect(headerCell(columns[0].id).nativeElement.classList)
      .not.toContain('grid-header__cell--col-selected');
    expect(headerCell(columns[1].id).nativeElement.classList)
      .toContain('grid-header__cell--col-selected');
  });

  it('reflects a pin set externally on the shared store (body ↔ header sync)', () => {
    component.highlight.toggleSelect(columns[2].id);
    fixture.detectChanges();

    expect(headerCell(columns[2].id).nativeElement.classList)
      .toContain('grid-header__cell--col-selected');
  });
});
