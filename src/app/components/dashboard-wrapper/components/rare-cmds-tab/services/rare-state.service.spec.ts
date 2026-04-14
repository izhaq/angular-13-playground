import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { take } from 'rxjs/operators';
import { RARE_DEFAULT_STATE } from '../models/rare-dashboard-defaults';
import { RareDashboardState, RareOperationsModel } from '../models/rare-dashboard.models';
import { DEFAULT_RARE_OPERATIONS } from '../components/rare-operations-list/rare-operations-list.models';
import { RareStateService } from './rare-state.service';

function makeTestRareOps(): RareOperationsModel {
  return {
    absCalibration: 'yes',
    tractionDiag: 'yes',
    steeringAlign: 'yes',
    brakeBleed: 'yes',
    suspReset: 'yes',
    eepromFlash: 'yes',
    canBusLog: 'yes',
    tirePressInit: 'yes',
    fuelMapSwitch: 'yes',
    coolantPurge: 'yes',
  };
}

describe('RareStateService', () => {
  let service: RareStateService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
    });
    service = TestBed.inject(RareStateService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('initial state$ emits RARE_DEFAULT_STATE', (done) => {
    service.state$.pipe(take(1)).subscribe((value) => {
      expect(value).toEqual(RARE_DEFAULT_STATE);
      done();
    });
  });

  it('updateState causes state$ to emit the new value', (done) => {
    const next: RareDashboardState = {
      scenario: 'city-traffic',
      cmd: { sides: ['left', 'right'], wheels: ['1', '2'] },
      rareOperations: makeTestRareOps(),
    };

    service.state$.pipe(take(2)).subscribe({
      next: (value) => {
        if (value.scenario === 'city-traffic') {
          expect(value).toEqual(next);
          done();
        }
      },
    });

    service.updateState(next);
  });

  it('saveConfig updates the saved baseline and posts to API', () => {
    const modified: RareDashboardState = {
      scenario: 'off-road-trail',
      cmd: { sides: ['right'], wheels: ['3', '4'] },
      rareOperations: makeTestRareOps(),
    };

    service.saveConfig(modified);
    expect(service.getSavedBaseline()).toEqual(modified);

    const req = httpMock.expectOne('/api/rare-config');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(modified);
    req.flush({ status: 'accepted' });
  });

  it('saveConfig rolls back baseline and state on HTTP error', (done) => {
    const originalBaseline = service.getSavedBaseline();

    const modified: RareDashboardState = {
      scenario: 'off-road-trail',
      cmd: { sides: ['right'], wheels: ['3', '4'] },
      rareOperations: makeTestRareOps(),
    };

    service.saveConfig(modified);

    const req = httpMock.expectOne('/api/rare-config');
    req.flush('Server Error', { status: 500, statusText: 'Internal Server Error' });

    expect(service.getSavedBaseline()).toEqual(originalBaseline);

    service.state$.pipe(take(1)).subscribe((value) => {
      expect(value).toEqual(originalBaseline);
      done();
    });
  });

  it('cancelChanges restores the saved baseline', (done) => {
    const modified: RareDashboardState = {
      scenario: 'city-traffic',
      cmd: { sides: ['left'], wheels: ['1'] },
      rareOperations: makeTestRareOps(),
    };

    service.saveConfig(modified);
    httpMock.expectOne('/api/rare-config').flush({ status: 'accepted' });

    service.updateState({
      ...modified,
      scenario: 'off-road-trail',
    });

    const restored = service.cancelChanges();
    expect(restored).toEqual(modified);

    service.state$.pipe(take(1)).subscribe((value) => {
      expect(value).toEqual(modified);
      done();
    });
  });

  it('resetToDefaults restores RARE_DEFAULT_STATE and resets baseline', (done) => {
    service.saveConfig({
      scenario: 'city-traffic',
      cmd: { sides: ['left', 'right'], wheels: ['1', '2', '3', '4'] },
      rareOperations: makeTestRareOps(),
    });
    httpMock.expectOne('/api/rare-config').flush({ status: 'accepted' });

    const restored = service.resetToDefaults();
    expect(restored).toEqual(RARE_DEFAULT_STATE);
    expect(service.getSavedBaseline()).toEqual(RARE_DEFAULT_STATE);

    service.state$.pipe(take(1)).subscribe((value) => {
      expect(value).toEqual(RARE_DEFAULT_STATE);
      done();
    });
  });
});
