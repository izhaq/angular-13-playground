import { Component, ViewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { BOARD_IDS, BoardId } from '../../shared/board-ids';
import { COL_IDS } from '../../shared/column-ids';
import { GridColumn, GridRow } from '../../shared/engine-sim.models';
import { StatusGridComponent } from './status-grid.component';

const COLUMNS: GridColumn[] = [
  { id: COL_IDS.left[0],  label: 'L1' },
  { id: COL_IDS.left[1],  label: 'L2' },
  { id: COL_IDS.right[0], label: 'R1' },
];

const ROWS: GridRow[] = [
  {
    fieldKey: 'tff',
    label: 'TFF',
    values: { [COL_IDS.left[0]]: 'NA', [COL_IDS.left[1]]: 'LA', [COL_IDS.right[0]]: 'DOM' },
  },
  {
    fieldKey: 'mlmTransmit',
    label: 'MLM transmit',
    values: { [COL_IDS.left[0]]: 'Y', [COL_IDS.left[1]]: 'N', [COL_IDS.right[0]]: 'Y' },
  },
];

/**
 * Host so inputs are bound through Angular (firing ngOnChanges and properly
 * dirtying the OnPush child view on change). Setting properties directly on
 * the inner component would not trigger either.
 */
@Component({
  template: `
    <engine-sim-status-grid
      [boardId]="boardId"
      [columns]="columns"
      [rows]="rows">
    </engine-sim-status-grid>
  `,
})
class HostComponent {
  boardId: BoardId = BOARD_IDS.primary;
  columns: GridColumn[] = COLUMNS;
  rows: GridRow[] = ROWS;
  @ViewChild(StatusGridComponent, { static: true }) grid!: StatusGridComponent;
}

describe('StatusGridComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [StatusGridComponent, HostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('precomputes grid-template-columns with one label col + N data cols', () => {
    const root: HTMLElement = fixture.debugElement.query(By.css('.status-grid')).nativeElement;
    // Cell minimums are sourced from CSS custom properties on `:host` (set
    // by the engine-sim tokens partial), so the asserted string contains
    // `var(--…)` references rather than literal pixel values.
    expect(root.style.gridTemplateColumns).toBe(
      'minmax(var(--grid-label-col-min), max-content) ' +
      'repeat(3, minmax(var(--grid-data-col-min), 1fr))',
    );
  });

  it('renders one column header per column with namespaced test ids', () => {
    const headers = fixture.debugElement.queryAll(By.css('.status-grid__col-header'));
    expect(headers.length).toBe(COLUMNS.length);

    const ids = headers.map(h => h.nativeElement.getAttribute('data-test-id'));
    expect(ids).toEqual([
      'grid-header-primary-left1',
      'grid-header-primary-left2',
      'grid-header-primary-right1',
    ]);
  });

  it('renders one row label per row with namespaced test ids', () => {
    const labels = fixture.debugElement.queryAll(By.css('.status-grid__row-label'));
    expect(labels.length).toBe(ROWS.length);
    expect(labels[0].nativeElement.getAttribute('data-test-id')).toBe('grid-label-primary-tff');
    expect(labels[1].nativeElement.getAttribute('data-test-id')).toBe('grid-label-primary-mlmTransmit');
  });

  it('renders rows × columns cells with composite test ids and abbr text', () => {
    const cells = fixture.debugElement.queryAll(By.css('.status-grid__cell'));
    expect(cells.length).toBe(ROWS.length * COLUMNS.length);

    const tffLeft1 = fixture.debugElement.query(
      By.css('[data-test-id="grid-primary-tff-left1"]'),
    ).nativeElement as HTMLElement;
    expect(tffLeft1.textContent?.trim()).toBe('NA');

    const mlmRight1 = fixture.debugElement.query(
      By.css('[data-test-id="grid-primary-mlmTransmit-right1"]'),
    ).nativeElement as HTMLElement;
    expect(mlmRight1.textContent?.trim()).toBe('Y');
  });

  it('sets hoveredColId on mouseenter and clears it on mouseleave', () => {
    const cell = fixture.debugElement.query(
      By.css('[data-test-id="grid-primary-tff-left2"]'),
    );

    cell.triggerEventHandler('mouseenter', null);
    expect(host.grid.hoveredColId).toBe(COL_IDS.left[1]);

    cell.triggerEventHandler('mouseleave', null);
    expect(host.grid.hoveredColId).toBeNull();
  });

  it('sets selectedCellId on cell click using composite "fieldKey|colId"', () => {
    const cell = fixture.debugElement.query(
      By.css('[data-test-id="grid-primary-mlmTransmit-right1"]'),
    );

    cell.triggerEventHandler('click', null);

    expect(host.grid.selectedCellId).toBe('mlmTransmit|right1');
  });

  it('namespaces all test ids by boardId so secondary grid is unique', () => {
    host.boardId = BOARD_IDS.secondary;
    fixture.detectChanges();

    expect(fixture.debugElement.query(
      By.css('[data-test-id="grid-secondary-tff-left1"]'),
    )).toBeTruthy();
    expect(fixture.debugElement.query(
      By.css('[data-test-id="grid-header-secondary-left1"]'),
    )).toBeTruthy();
    expect(fixture.debugElement.query(
      By.css('[data-test-id="grid-label-secondary-tff"]'),
    )).toBeTruthy();
  });
});
