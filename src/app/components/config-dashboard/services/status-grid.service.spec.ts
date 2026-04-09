import { TestBed } from '@angular/core/testing';
import { take } from 'rxjs/operators';
import { FieldUpdate } from '../models/grid.models';
import { GRID_COLUMNS } from '../../../mocks/mock-data';
import {
  DEFAULT_VEHICLE_CONTROLS,
  VEHICLE_CONTROL_FIELDS,
  VEHICLE_CONTROL_KEYS,
} from '../components/operations-list/operations-list.models';
import { StatusGridService } from './status-grid.service';

function expectedConfirmedValue(index: number): string {
  const val = DEFAULT_VEHICLE_CONTROLS[VEHICLE_CONTROL_KEYS[index]];
  return Array.isArray(val) ? val.join(', ') : val;
}

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

  it('initial gridRows$ has 10 rows', (done) => {
    service.gridRows$.pipe(take(1)).subscribe((rows) => {
      expect(rows.length).toBe(10);
      done();
    });
  });

  it('each initial row has correct structure with enriched cells', (done) => {
    service.gridRows$.pipe(take(1)).subscribe((rows) => {
      rows.forEach((row, i) => {
        expect(row.field).toBe(`vehicleControls.${VEHICLE_CONTROL_KEYS[i]}`);
        expect(row.label).toBe(VEHICLE_CONTROL_FIELDS[i].label);
        expect(row.confirmedValue).toBe(expectedConfirmedValue(i));
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
    service.applyUpdate({
      field: 'vehicleControls.speedLimit',
      value: '120 km/h',
    });

    service.gridRows$.pipe(take(1)).subscribe((rows) => {
      const row = rows.find(r => r.field === 'vehicleControls.speedLimit')!;
      expect(row.confirmedValue).toBe('120 km/h');
      row.cells.forEach((cell) => {
        expect(cell.active).toBe(false);
      });
      done();
    });
  });

  it('applyUpdate with statuses enriches color cells with backgroundColor', (done) => {
    service.applyUpdate({
      field: 'vehicleControls.headlights',
      statuses: { red: true, p: true },
    });

    service.gridRows$.pipe(take(1)).subscribe((rows) => {
      const row = rows.find(r => r.field === 'vehicleControls.headlights')!;
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
    service.applyUpdate({
      field: 'vehicleControls.terrain',
      value: 'Gravel, Sand',
      statuses: {
        red: true, yellow: false, green: true,
        n: false, p: true, l: false,
      },
    });

    service.gridRows$.pipe(take(1)).subscribe((rows) => {
      const row = rows.find(r => r.field === 'vehicleControls.terrain')!;
      expect(row.confirmedValue).toBe('Gravel, Sand');
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
      const wipersRowBefore = JSON.parse(JSON.stringify(before.find(r => r.field === 'vehicleControls.wipers')));

      service.applyUpdate({
        field: 'vehicleControls.terrain',
        value: 'Mud',
        statuses: { red: true },
      });

      service.gridRows$.pipe(take(1)).subscribe((after) => {
        expect(after.find(r => r.field === 'vehicleControls.wipers')).toEqual(wipersRowBefore);
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
      field: 'vehicleControls.gear',
      value: 'D',
      statuses: { red: true, green: true },
    });

    service.resetToDefaults();

    service.gridRows$.pipe(take(1)).subscribe((rows) => {
      const row = rows.find(r => r.field === 'vehicleControls.gear')!;
      expect(row.confirmedValue).toBe('p');
      row.cells.forEach((cell) => {
        expect(cell.active).toBe(false);
        expect(cell.backgroundColor).toBe('#ffffff');
        expect(cell.showText).toBe(false);
      });
      done();
    });
  });
});
