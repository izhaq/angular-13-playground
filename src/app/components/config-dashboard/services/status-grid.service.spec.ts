import { TestBed } from '@angular/core/testing';
import { take } from 'rxjs/operators';
import { FieldUpdate, RowViewModel } from '../models/grid.models';
import { GRID_COLUMNS } from '../../../mocks/mock-data';
import { OPERATIONS_KEYS } from '../components/operations-form-list/operations-form-list.models';
import { StatusGridService } from './status-grid.service';

describe('StatusGridService', () => {
  let service: StatusGridService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(StatusGridService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should expose columnCount and cellColumnsTemplate', () => {
    expect(service.columnCount).toBe(GRID_COLUMNS.length);
    expect(service.cellColumnsTemplate).toContain(`repeat(${GRID_COLUMNS.length}`);
  });

  it('initial gridRows$ has 10 rows', (done) => {
    service.gridRows$.pipe(take(1)).subscribe((rows) => {
      expect(rows.length).toBe(10);
      done();
    });
  });

  it('each initial row has correct structure with enriched cells', (done) => {
    service.gridRows$.pipe(take(1)).subscribe((rows) => {
      rows.forEach((row, i) => {
        expect(row.field).toBe(`operations.${OPERATIONS_KEYS[i]}`);
        expect(row.label).toBe(`act ${i + 1}`);
        expect(row.confirmedValue).toBe('option-1');
        expect(row.cells.length).toBe(GRID_COLUMNS.length);
        row.cells.forEach((cell) => {
          expect(cell.active).toBe(false);
          expect(cell.backgroundColor).toBe('#ffffff');
          expect(cell.showText).toBe(false);
          expect(cell.textLabel).toBe('');
        });
      });
      done();
    });
  });

  it('applyUpdate with value updates confirmedValue', (done) => {
    const update: FieldUpdate = {
      field: 'operations.opr3',
      value: 'option-3',
    };

    service.applyUpdate(update);

    service.gridRows$.pipe(take(1)).subscribe((rows) => {
      const row = rows.find(r => r.field === 'operations.opr3')!;
      expect(row.confirmedValue).toBe('option-3');
      row.cells.forEach((cell) => {
        expect(cell.active).toBe(false);
      });
      done();
    });
  });

  it('applyUpdate with statuses enriches color cells with backgroundColor', (done) => {
    service.applyUpdate({
      field: 'operations.opr5',
      statuses: { red: true, p: true },
    });

    service.gridRows$.pipe(take(1)).subscribe((rows) => {
      const row = rows.find(r => r.field === 'operations.opr5')!;
      const redCell = row.cells.find((c) => c.columnId === 'red')!;
      const pCell = row.cells.find((c) => c.columnId === 'p')!;
      const greenCell = row.cells.find((c) => c.columnId === 'green')!;

      expect(redCell.active).toBe(true);
      expect(redCell.backgroundColor).toBe('#ee7d77');

      expect(pCell.active).toBe(true);
      expect(pCell.showText).toBe(true);
      expect(pCell.textLabel).toBe('P');

      expect(greenCell.active).toBe(false);
      expect(greenCell.backgroundColor).toBe('#ffffff');
      done();
    });
  });

  it('applyUpdate with full row replaces value and all statuses', (done) => {
    const update: FieldUpdate = {
      field: 'operations.opr1',
      value: 'option-2',
      statuses: {
        red: true,
        yellow: false,
        green: true,
        n: false,
        p: true,
        l: false,
      },
    };

    service.applyUpdate(update);

    service.gridRows$.pipe(take(1)).subscribe((rows) => {
      const row = rows.find(r => r.field === 'operations.opr1')!;
      expect(row.confirmedValue).toBe('option-2');
      expect(row.cells.find((c) => c.columnId === 'red')!.active).toBe(true);
      expect(row.cells.find((c) => c.columnId === 'yellow')!.active).toBe(false);
      expect(row.cells.find((c) => c.columnId === 'green')!.active).toBe(true);
      expect(row.cells.find((c) => c.columnId === 'n')!.active).toBe(false);
      expect(row.cells.find((c) => c.columnId === 'p')!.active).toBe(true);
      expect(row.cells.find((c) => c.columnId === 'l')!.active).toBe(false);
      done();
    });
  });

  it('applyUpdate does not affect other rows', (done) => {
    service.gridRows$.pipe(take(1)).subscribe((before) => {
      const opr6Before = JSON.parse(JSON.stringify(before.find(r => r.field === 'operations.opr6')));

      service.applyUpdate({
        field: 'operations.opr1',
        value: 'option-4',
        statuses: { red: true },
      });

      service.gridRows$.pipe(take(1)).subscribe((after) => {
        expect(after.find(r => r.field === 'operations.opr6')).toEqual(opr6Before);
        done();
      });
    });
  });

  it('applyUpdate ignores unknown fields', (done) => {
    service.gridRows$.pipe(take(1)).subscribe((before) => {
      const snapshot = JSON.parse(JSON.stringify(before));

      service.applyUpdate({ field: 'nonexistent.99', value: 'foo' });

      service.gridRows$.pipe(take(1)).subscribe((after) => {
        expect(after).toEqual(snapshot);
        done();
      });
    });
  });

  it('resetToDefaults re-seeds all rows with inactive enriched cells', (done) => {
    service.applyUpdate({
      field: 'operations.opr4',
      value: 'option-4',
      statuses: { red: true, green: true },
    });

    service.resetToDefaults();

    service.gridRows$.pipe(take(1)).subscribe((rows) => {
      const row = rows.find(r => r.field === 'operations.opr4')!;
      expect(row.confirmedValue).toBe('option-1');
      row.cells.forEach((cell) => {
        expect(cell.active).toBe(false);
        expect(cell.backgroundColor).toBe('#ffffff');
        expect(cell.showText).toBe(false);
      });
      done();
    });
  });
});
