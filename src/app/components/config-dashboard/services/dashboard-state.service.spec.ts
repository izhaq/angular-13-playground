import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { take } from 'rxjs/operators';
import { DEFAULT_STATE } from '../models/dashboard-defaults';
import { DashboardState, OperationsValue } from '../models/dashboard.models';
import { DashboardStateService } from './dashboard-state.service';

function makeTestOperations(): OperationsValue {
  return {
    ttm: 'captive',
    weather: 'yes',
    videoRec: 'external',
    videoType: ['hd', '4k'],
    headlights: 'yes',
    pwrOnOff: 'off',
    force: 'force-f',
    stability: 'yes',
    cruiseCtrl: 'yes',
    plr: 'yes',
    aux: 'yes',
  };
}

describe('DashboardStateService', () => {
  let service: DashboardStateService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
    });
    service = TestBed.inject(DashboardStateService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('initial state$ emits DEFAULT_STATE', (done) => {
    service.state$.pipe(take(1)).subscribe((value) => {
      expect(value).toEqual(DEFAULT_STATE);
      done();
    });
  });

  it('updateState causes state$ to emit the new value', (done) => {
    const next: DashboardState = {
      scenario: 'city-traffic',
      cmd: { sides: ['left', 'right'], wheels: ['1', '2'] },
      operations: makeTestOperations(),
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
    const modified: DashboardState = {
      scenario: 'off-road-trail',
      cmd: { sides: ['right'], wheels: ['3', '4'] },
      operations: makeTestOperations(),
    };

    service.saveConfig(modified);
    expect(service.getSavedBaseline()).toEqual(modified);

    const req = httpMock.expectOne('/api/config');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(modified);
    req.flush({ status: 'accepted' });
  });

  it('saveConfig rolls back baseline and state on HTTP error', (done) => {
    const originalBaseline = service.getSavedBaseline();

    const modified: DashboardState = {
      scenario: 'off-road-trail',
      cmd: { sides: ['right'], wheels: ['3', '4'] },
      operations: makeTestOperations(),
    };

    service.saveConfig(modified);

    const req = httpMock.expectOne('/api/config');
    req.flush('Server Error', { status: 500, statusText: 'Internal Server Error' });

    expect(service.getSavedBaseline()).toEqual(originalBaseline);

    service.state$.pipe(take(1)).subscribe((value) => {
      expect(value).toEqual(originalBaseline);
      done();
    });
  });

  it('cancelChanges restores the saved baseline', (done) => {
    const modified: DashboardState = {
      scenario: 'city-traffic',
      cmd: { sides: ['left'], wheels: ['1'] },
      operations: makeTestOperations(),
    };

    service.saveConfig(modified);
    httpMock.expectOne('/api/config').flush({ status: 'accepted' });

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

  it('resetToDefaults restores DEFAULT_STATE and resets baseline', (done) => {
    service.saveConfig({
      scenario: 'city-traffic',
      cmd: { sides: ['left', 'right'], wheels: ['1', '2', '3', '4'] },
      operations: makeTestOperations(),
    });
    httpMock.expectOne('/api/config').flush({ status: 'accepted' });

    const restored = service.resetToDefaults();
    expect(restored).toEqual(DEFAULT_STATE);
    expect(service.getSavedBaseline()).toEqual(DEFAULT_STATE);

    service.state$.pipe(take(1)).subscribe((value) => {
      expect(value).toEqual(DEFAULT_STATE);
      done();
    });
  });
});
