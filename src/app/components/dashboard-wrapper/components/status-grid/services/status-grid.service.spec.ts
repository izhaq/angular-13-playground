import { TestBed } from '@angular/core/testing';
import { take } from 'rxjs/operators';
import { GRID_COLUMNS } from '../models/grid-columns';
import {
  OPERATIONS_FIELDS,
  OPERATIONS_KEYS,
} from '../../frequent-cmds-tab/components/frequent-operations-list/frequent-operations-list.models';
import { CMD_TEST_FIELDS, CMD_TEST_KEYS } from '../../frequent-cmds-tab/components/cmd-test-panel/cmd-test-panel.models';
import { buildGridRowDefs } from '../models/grid-defaults';
import { StatusGridService } from './status-grid.service';
import { CellValue } from '../models/grid.models';

const ALL_FIELDS = [...OPERATIONS_FIELDS, ...CMD_TEST_FIELDS];
const ALL_KEYS = [...OPERATIONS_KEYS, ...CMD_TEST_KEYS];

function cell(value: string, abbr: string): CellValue {
  return { value, abbr };
}

describe('StatusGridService', () => {
  let service: StatusGridService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [StatusGridService],
    });
    service = TestBed.inject(StatusGridService);
    service.configure(GRID_COLUMNS, buildGridRowDefs());
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should expose columnCount', () => {
    expect(service.columnCount).toBe(GRID_COLUMNS.length);
  });

  it('initial gridRows$ has correct number of rows after configure', (done) => {
    service.gridRows$.pipe(take(1)).subscribe((rows) => {
      expect(rows.length).toBe(ALL_FIELDS.length);
      done();
    });
  });

  it('each initial row has correct structure with empty cells', (done) => {
    service.gridRows$.pipe(take(1)).subscribe((rows) => {
      rows.forEach((row, i) => {
        expect(row.field).toBe(ALL_KEYS[i]);
        expect(row.label).toBe(ALL_FIELDS[i].label);
        expect(Object.keys(row.cells).length).toBe(GRID_COLUMNS.length);
        GRID_COLUMNS.forEach((col) => {
          expect(row.cells[col.id]).toEqual({ value: '', abbr: '' });
        });
      });
      done();
    });
  });

  it('applyUpdate merges server-provided cell values', (done) => {
    service.applyUpdate({
      field: 'ttm',
      cells: {
        L1: cell('captive', 'CAP'),
        L2: cell('real', 'REA'),
      },
    });

    service.gridRows$.pipe(take(1)).subscribe((rows) => {
      const row = rows.find(r => r.field === 'ttm')!;
      expect(row.cells['L1']).toEqual(cell('captive', 'CAP'));
      expect(row.cells['L2']).toEqual(cell('real', 'REA'));
      expect(row.cells['L3']).toEqual({ value: '', abbr: '' });
      done();
    });
  });

  it('applyUpdate handles multi-select cell values', (done) => {
    service.applyUpdate({
      field: 'videoType',
      cells: {
        L1: cell('hd,4k', 'HD,4K'),
        R1: cell('no', 'NO'),
      },
    });

    service.gridRows$.pipe(take(1)).subscribe((rows) => {
      const row = rows.find(r => r.field === 'videoType')!;
      expect(row.cells['L1']).toEqual(cell('hd,4k', 'HD,4K'));
      expect(row.cells['R1']).toEqual(cell('no', 'NO'));
      done();
    });
  });

  it('applyUpdate merges force values correctly', (done) => {
    service.applyUpdate({
      field: 'force',
      cells: {
        L1: cell('normal', 'NRM'),
        L2: cell('force-f', 'FRC'),
        R1: cell('force-no', 'FNO'),
      },
    });

    service.gridRows$.pipe(take(1)).subscribe((rows) => {
      const row = rows.find(r => r.field === 'force')!;
      expect(row.cells['L1']).toEqual(cell('normal', 'NRM'));
      expect(row.cells['L2']).toEqual(cell('force-f', 'FRC'));
      expect(row.cells['R1']).toEqual(cell('force-no', 'FNO'));
      done();
    });
  });

  it('applyUpdate merges pwrOnOff values correctly', (done) => {
    service.applyUpdate({
      field: 'pwrOnOff',
      cells: {
        L1: cell('on', 'ON'),
        R1: cell('off', 'OFF'),
      },
    });

    service.gridRows$.pipe(take(1)).subscribe((rows) => {
      const row = rows.find(r => r.field === 'pwrOnOff')!;
      expect(row.cells['L1']).toEqual(cell('on', 'ON'));
      expect(row.cells['R1']).toEqual(cell('off', 'OFF'));
      done();
    });
  });

  it('applyUpdate does not affect other rows', (done) => {
    service.gridRows$.pipe(take(1)).subscribe((before) => {
      const stabilityBefore = JSON.parse(JSON.stringify(before.find(r => r.field === 'stability')));

      service.applyUpdate({
        field: 'ttm',
        cells: { L1: cell('captive', 'CAP') },
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
      cells: {
        L1: cell('normal', 'NRM'),
        L2: cell('force-f', 'FRC'),
      },
    });

    service.applyUpdate({
      field: 'force',
      cells: { R1: cell('force-no', 'FNO') },
    });

    service.gridRows$.pipe(take(1)).subscribe((rows) => {
      const row = rows.find(r => r.field === 'force')!;
      expect(row.cells['L1']).toEqual(cell('normal', 'NRM'));
      expect(row.cells['L2']).toEqual(cell('force-f', 'FRC'));
      expect(row.cells['R1']).toEqual(cell('force-no', 'FNO'));
      expect(row.cells['R2']).toEqual({ value: '', abbr: '' });
      done();
    });
  });

  it('applyUpdate ignores unknown fields', (done) => {
    service.gridRows$.pipe(take(1)).subscribe((before) => {
      const snapshot = JSON.parse(JSON.stringify(before));

      service.applyUpdate({ field: 'nonexistent', cells: { L1: cell('x', 'X') } });

      service.gridRows$.pipe(take(1)).subscribe((after) => {
        expect(after).toEqual(snapshot);
        done();
      });
    });
  });

  it('resetToDefaults re-seeds all rows with empty cells', (done) => {
    service.applyUpdate({
      field: 'force',
      cells: {
        L1: cell('normal', 'NRM'),
        L2: cell('force-f', 'FRC'),
        R1: cell('force-no', 'FNO'),
        R2: cell('normal', 'NRM'),
      },
    });

    service.resetToDefaults();

    service.gridRows$.pipe(take(1)).subscribe((rows) => {
      const row = rows.find(r => r.field === 'force')!;
      GRID_COLUMNS.forEach((col) => {
        expect(row.cells[col.id]).toEqual({ value: '', abbr: '' });
      });
      done();
    });
  });
});
