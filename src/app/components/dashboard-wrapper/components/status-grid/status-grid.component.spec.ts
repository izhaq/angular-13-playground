import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { GridConfig, RowViewModel } from './models/grid.models';
import { StatusGridComponent } from './status-grid.component';
import { StatusGridModule } from './status-grid.module';

const TEST_CONFIG: GridConfig = {
  rows: [
    { field: 'ttm', label: 'TTM' },
    { field: 'weather', label: 'Weather' },
    { field: 'videoRec', label: 'Video rec' },
  ],
  columns: [
    { id: 'L1', header: 'L1' },
    { id: 'L2', header: 'L2' },
    { id: 'R1', header: 'R1' },
    { id: 'R2', header: 'R2' },
  ],
};

const TEST_ROWS: RowViewModel[] = [
  { field: 'ttm', label: 'TTM', cells: { L1: 'CAP', L2: 'CAP', R1: '', R2: '' } },
  { field: 'weather', label: 'Weather', cells: { L1: 'NO', L2: 'NO', R1: 'YES', R2: '' } },
  { field: 'videoRec', label: 'Video rec', cells: { L1: '', L2: '', R1: '', R2: '' } },
];

describe('StatusGridComponent', () => {
  let fixture: ComponentFixture<StatusGridComponent>;
  let component: StatusGridComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StatusGridModule],
    }).compileComponents();

    fixture = TestBed.createComponent(StatusGridComponent);
    component = fixture.componentInstance;
    component.config = TEST_CONFIG;
    component.rows = TEST_ROWS;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render a table element', () => {
    const table = fixture.debugElement.query(By.css('table'));
    expect(table).toBeTruthy();
  });

  it('should render column headers from config', () => {
    const headers = fixture.debugElement.queryAll(By.css('.status-grid__col-header'));
    expect(headers.length).toBe(TEST_CONFIG.columns.length);
    headers.forEach((header, i) => {
      expect(header.nativeElement.textContent.trim()).toBe(TEST_CONFIG.columns[i].header);
    });
  });

  it('should render the correct number of body rows', () => {
    const rows = fixture.debugElement.queryAll(By.css('tbody tr'));
    expect(rows.length).toBe(TEST_ROWS.length);
  });

  it('should render labels in the first column of each row', () => {
    const labels = fixture.debugElement.queryAll(By.css('.status-grid__label'));
    expect(labels.length).toBe(TEST_ROWS.length);
    labels.forEach((label, i) => {
      expect(label.nativeElement.textContent.trim()).toBe(TEST_ROWS[i].label);
    });
  });

  it('should render abbreviation text in cells', () => {
    const firstRow = fixture.debugElement.queryAll(By.css('tbody tr'))[0];
    const cells = firstRow.queryAll(By.css('.status-grid__cell'));
    expect(cells.length).toBe(TEST_CONFIG.columns.length);
    expect(cells[0].nativeElement.textContent.trim()).toBe('CAP');
    expect(cells[1].nativeElement.textContent.trim()).toBe('CAP');
    expect(cells[2].nativeElement.textContent.trim()).toBe('');
    expect(cells[3].nativeElement.textContent.trim()).toBe('');
  });

  it('should not render confirmed values (labels only)', () => {
    const values = fixture.debugElement.queryAll(By.css('.status-grid__value'));
    expect(values.length).toBe(0);
  });

  it('should add hovered class on column hover', () => {
    const firstHeaderCell = fixture.debugElement.queryAll(By.css('.status-grid__col-header'))[0];
    firstHeaderCell.triggerEventHandler('mouseenter', {});
    fixture.detectChanges();

    expect(component.hoveredColumnId).toBe('L1');

    const hoveredCells = fixture.debugElement.queryAll(By.css('.status-grid__cell--hovered'));
    expect(hoveredCells.length).toBe(TEST_ROWS.length);

    firstHeaderCell.triggerEventHandler('mouseleave', {});
    fixture.detectChanges();
    expect(component.hoveredColumnId).toBeNull();
  });

  it('should add focused class on cell click', () => {
    const firstRow = fixture.debugElement.queryAll(By.css('tbody tr'))[0];
    const firstCell = firstRow.queryAll(By.css('.status-grid__cell'))[0];
    firstCell.triggerEventHandler('click', {});
    fixture.detectChanges();

    expect(component.focusedCell).toEqual({ field: 'ttm', columnId: 'L1' });
    expect(firstCell.nativeElement.classList).toContain('status-grid__cell--focused');
  });

  it('should toggle focused cell on second click', () => {
    component.onCellClick('ttm', 'L1');
    expect(component.focusedCell).toEqual({ field: 'ttm', columnId: 'L1' });

    component.onCellClick('ttm', 'L1');
    expect(component.focusedCell).toBeNull();
  });

  it('should move focus to a different cell on click', () => {
    component.onCellClick('ttm', 'L1');
    component.onCellClick('weather', 'R1');
    expect(component.focusedCell).toEqual({ field: 'weather', columnId: 'R1' });
  });
});


