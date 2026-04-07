import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { CellViewModel, RowViewModel } from '../../models/grid.models';
import { StatusGridComponent } from './status-grid.component';
import { StatusGridModule } from './status-grid.module';

function buildCellViewModel(
  columnId: string,
  active: boolean,
  backgroundColor: string,
  textLabel: string,
  showText: boolean,
): CellViewModel {
  return { columnId, active, backgroundColor, textLabel, showText };
}

function buildTestRows(): RowViewModel[] {
  return Array.from({ length: 10 }, (_, rowIndex) => {
    const activeIndex = rowIndex % 6;
    const cells: CellViewModel[] = [
      buildCellViewModel('col-0', activeIndex === 0, activeIndex === 0 ? '#ff0000' : '#ffffff', '', false),
      buildCellViewModel('col-1', activeIndex === 1, activeIndex === 1 ? '#00ff00' : '#ffffff', '', false),
      buildCellViewModel('col-2', activeIndex === 2, '#ffffff', activeIndex === 2 ? 'OK' : '', activeIndex === 2),
      buildCellViewModel('col-3', activeIndex === 3, '#ffffff', activeIndex === 3 ? 'N/A' : '', activeIndex === 3),
      buildCellViewModel('col-4', activeIndex === 4, activeIndex === 4 ? '#0000ff' : '#ffffff', '', false),
      buildCellViewModel('col-5', activeIndex === 5, '#ffffff', activeIndex === 5 ? 'Done' : '', activeIndex === 5),
    ];
    return {
      field: `field-${rowIndex}`,
      label: `Label ${rowIndex + 1}`,
      confirmedValue: `Value ${rowIndex + 1}`,
      cells,
    };
  });
}

describe('StatusGridComponent', () => {
  let fixture: ComponentFixture<StatusGridComponent>;
  let component: StatusGridComponent;

  const colCount = 6;
  const cellColumnsTemplate = `repeat(${colCount}, minmax(2.5em, 1fr))`;
  const gridRows: RowViewModel[] = buildTestRows();

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StatusGridModule],
    }).compileComponents();

    fixture = TestBed.createComponent(StatusGridComponent);
    component = fixture.componentInstance;
    component.columnCount = colCount;
    component.cellColumnsTemplate = cellColumnsTemplate;
    component.gridRows = gridRows;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render the correct number of rows', () => {
    const rows = fixture.debugElement.queryAll(By.css('.status-grid__row'));
    expect(rows.length).toBe(10);
  });

  it('should render header cells matching columnCount', () => {
    const headerCells = fixture.debugElement.queryAll(By.css('.status-grid__header-cell'));
    expect(headerCells.length).toBe(colCount);
  });

  it('should show label and confirmedValue for each row', () => {
    gridRows.forEach((row, index) => {
      const rowEl = fixture.debugElement.queryAll(By.css('.status-grid__row'))[index];
      const label = rowEl.query(By.css('.status-grid__label'));
      const value = rowEl.query(By.css('.status-grid__value'));
      expect(label.nativeElement.textContent.trim()).toBe(row.label);
      expect(value.nativeElement.textContent.trim()).toBe(row.confirmedValue);
    });
  });

  it('should render the correct number of cells per row', () => {
    fixture.debugElement.queryAll(By.css('.status-grid__row')).forEach((rowEl) => {
      const cells = rowEl.queryAll(By.css('.status-grid__cell'));
      expect(cells.length).toBe(colCount);
    });
  });

  it('should fill the cell background for an active color cell', () => {
    const firstRow = fixture.debugElement.queryAll(By.css('.status-grid__row'))[0];
    const cells = firstRow.queryAll(By.css('.status-grid__cell'));
    const activeIndex = gridRows[0].cells.findIndex((c) => c.active);
    const cellEl = cells[activeIndex].nativeElement as HTMLElement;
    expect(cellEl.style.backgroundColor).toBe('rgb(255, 0, 0)');
  });

  it('should show text label for an active text cell', () => {
    const rowIndex = 2;
    const row = fixture.debugElement.queryAll(By.css('.status-grid__row'))[rowIndex];
    const cells = row.queryAll(By.css('.status-grid__cell'));
    const activeIndex = gridRows[rowIndex].cells.findIndex((c) => c.active);
    const indicator = cells[activeIndex].query(By.css('.status-grid__text-indicator'));
    expect(indicator).toBeTruthy();
    expect(indicator.nativeElement.textContent.trim()).toBe(gridRows[rowIndex].cells[activeIndex].textLabel);
  });

  it('should leave inactive cells with white background and no text indicator', () => {
    const firstRow = fixture.debugElement.queryAll(By.css('.status-grid__row'))[0];
    const cells = firstRow.queryAll(By.css('.status-grid__cell'));
    gridRows[0].cells.forEach((cell, i) => {
      if (cell.active) {
        return;
      }
      const cellEl = cells[i].nativeElement as HTMLElement;
      expect(cellEl.style.backgroundColor).toBe('rgb(255, 255, 255)');
      expect(cells[i].query(By.css('.status-grid__text-indicator'))).toBeNull();
    });
  });

  it('should keep label and value outside the cell grid structure', () => {
    fixture.debugElement.queryAll(By.css('.status-grid__row')).forEach((rowEl) => {
      const info = rowEl.query(By.css('.status-grid__info'));
      const cellsHost = rowEl.query(By.css('.status-grid__cells'));
      expect(info).toBeTruthy();
      expect(cellsHost).toBeTruthy();
      expect(info.query(By.css('.status-grid__cell'))).toBeNull();
      const labelsInCells = cellsHost.queryAll(By.css('.status-grid__label'));
      const valuesInCells = cellsHost.queryAll(By.css('.status-grid__value'));
      expect(labelsInCells.length).toBe(0);
      expect(valuesInCells.length).toBe(0);
    });
  });
});
