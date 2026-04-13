import { TestBed } from '@angular/core/testing';
import { take } from 'rxjs/operators';
import { GRID_COLUMNS } from '../../../mocks/mock-data';
import {
  OPERATIONS_FIELDS,
  OPERATIONS_KEYS,
} from '../components/operations-list/operations-list.models';
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

  it('should expose columnCount', () => {
    expect(service.columnCount).toBe(GRID_COLUMNS.length);
  });

  it('initial gridRows$ has correct number of rows', (done) => {
    service.gridRows$.pipe(take(1)).subscribe((rows) => {
      expect(rows.length).toBe(OPERATIONS_FIELDS.length);
      done();
    });
  });

  it('each initial row has correct structure with empty cells', (done) => {
    service.gridRows$.pipe(take(1)).subscribe((rows) => {
      rows.forEach((row, i) => {
        expect(row.field).toBe(OPERATIONS_KEYS[i]);
        expect(row.label).toBe(OPERATIONS_FIELDS[i].label);
        expect(Object.keys(row.cells).length).toBe(GRID_COLUMNS.length);
        GRID_COLUMNS.forEach((col) => {
          expect(row.cells[col.id]).toBe('');
        });
      });
      done();
    });
  });

  it('applyUpdate maps raw value keys to abbreviations', (done) => {
    service.applyUpdate({
      field: 'ttm',
      cells: { L1: 'captive', L2: 'real' },
    });

    service.gridRows$.pipe(take(1)).subscribe((rows) => {
      const row = rows.find(r => r.field === 'ttm')!;
      expect(row.cells['L1']).toBe('CAP');
      expect(row.cells['L2']).toBe('REA');
      expect(row.cells['L3']).toBe('');
      done();
    });
  });

  it('applyUpdate maps comma-separated multi-select values to abbreviations', (done) => {
    service.applyUpdate({
      field: 'videoType',
      cells: { L1: 'hd,4k', R1: 'no' },
    });

    service.gridRows$.pipe(take(1)).subscribe((rows) => {
      const row = rows.find(r => r.field === 'videoType')!;
      expect(row.cells['L1']).toBe('HD,4K');
      expect(row.cells['R1']).toBe('NO');
      done();
    });
  });

  it('applyUpdate passes through values with no abbreviation match', (done) => {
    service.applyUpdate({
      field: 'ttm',
      cells: { L1: 'unknown-value' },
    });

    service.gridRows$.pipe(take(1)).subscribe((rows) => {
      const row = rows.find(r => r.field === 'ttm')!;
      expect(row.cells['L1']).toBe('unknown-value');
      done();
    });
  });

  it('applyUpdate maps force values correctly', (done) => {
    service.applyUpdate({
      field: 'force',
      cells: { L1: 'normal', L2: 'force-f', R1: 'force-no' },
    });

    service.gridRows$.pipe(take(1)).subscribe((rows) => {
      const row = rows.find(r => r.field === 'force')!;
      expect(row.cells['L1']).toBe('NRM');
      expect(row.cells['L2']).toBe('FRC');
      expect(row.cells['R1']).toBe('FNO');
      done();
    });
  });

  it('applyUpdate maps pwrOnOff values correctly', (done) => {
    service.applyUpdate({
      field: 'pwrOnOff',
      cells: { L1: 'on', R1: 'off' },
    });

    service.gridRows$.pipe(take(1)).subscribe((rows) => {
      const row = rows.find(r => r.field === 'pwrOnOff')!;
      expect(row.cells['L1']).toBe('ON');
      expect(row.cells['R1']).toBe('OFF');
      done();
    });
  });

  it('applyUpdate does not affect other rows', (done) => {
    service.gridRows$.pipe(take(1)).subscribe((before) => {
      const stabilityBefore = JSON.parse(JSON.stringify(before.find(r => r.field === 'stability')));

      service.applyUpdate({
        field: 'ttm',
        cells: { L1: 'captive' },
      });

      service.gridRows$.pipe(take(1)).subscribe((after) => {
        expect(after.find(r => r.field === 'stability')).toEqual(stabilityBefore);
        done();
      });
    });
  });

  it('applyUpdate preserves existing cells not in the update', (done) => {
    service.applyUpdate({
      field: 'force',
      cells: { L1: 'normal', L2: 'force-f' },
    });

    service.applyUpdate({
      field: 'force',
      cells: { R1: 'force-no' },
    });

    service.gridRows$.pipe(take(1)).subscribe((rows) => {
      const row = rows.find(r => r.field === 'force')!;
      expect(row.cells['L1']).toBe('NRM');
      expect(row.cells['L2']).toBe('FRC');
      expect(row.cells['R1']).toBe('FNO');
      expect(row.cells['R2']).toBe('');
      done();
    });
  });

  it('applyUpdate ignores unknown fields', (done) => {
    service.gridRows$.pipe(take(1)).subscribe((before) => {
      const snapshot = JSON.parse(JSON.stringify(before));

      service.applyUpdate({ field: 'nonexistent', cells: { L1: 'X' } });

      service.gridRows$.pipe(take(1)).subscribe((after) => {
        expect(after).toEqual(snapshot);
        done();
      });
    });
  });

  it('resetToDefaults re-seeds all rows with empty cells', (done) => {
    service.applyUpdate({
      field: 'force',
      cells: { L1: 'normal', L2: 'force-f', R1: 'force-no', R2: 'normal' },
    });

    service.resetToDefaults();

    service.gridRows$.pipe(take(1)).subscribe((rows) => {
      const row = rows.find(r => r.field === 'force')!;
      GRID_COLUMNS.forEach((col) => {
        expect(row.cells[col.id]).toBe('');
      });
      done();
    });
  });
});
