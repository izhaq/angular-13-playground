import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { take } from 'rxjs/operators';
import { TabStateConfig, TAB_STATE_CONFIG } from './tab-state.config';
import { TabStateService } from './tab-state.service';

interface TestState {
  scenario: string;
  value: string;
}

const DEFAULT_TEST_STATE: TestState = { scenario: 'default', value: 'initial' };
const TEST_API_URL = '/api/test-config';

const TEST_CONFIG: TabStateConfig<TestState> = {
  defaultState: DEFAULT_TEST_STATE,
  apiUrl: TEST_API_URL,
};

describe('TabStateService', () => {
  let service: TabStateService<TestState>;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        TabStateService,
        { provide: TAB_STATE_CONFIG, useValue: TEST_CONFIG },
      ],
    });
    service = TestBed.inject(TabStateService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('initial state$ emits the configured default state', (done) => {
    service.state$.pipe(take(1)).subscribe((value) => {
      expect(value).toEqual(DEFAULT_TEST_STATE);
      done();
    });
  });

  it('updateState causes state$ to emit the new value', (done) => {
    const next: TestState = { scenario: 'updated', value: 'changed' };

    service.state$.pipe(take(2)).subscribe({
      next: (value) => {
        if (value.scenario === 'updated') {
          expect(value).toEqual(next);
          done();
        }
      },
    });

    service.updateState(next);
  });

  it('saveConfig updates the saved baseline and posts to API', () => {
    const modified: TestState = { scenario: 'saved', value: 'new-value' };

    service.saveConfig(modified);
    expect(service.getSavedBaseline()).toEqual(modified);

    const req = httpMock.expectOne(TEST_API_URL);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(modified);
    req.flush({ status: 'accepted' });
  });

  it('saveConfig rolls back baseline and state on HTTP error', (done) => {
    const originalBaseline = service.getSavedBaseline();

    const modified: TestState = { scenario: 'will-fail', value: 'bad' };

    service.saveConfig(modified);

    const req = httpMock.expectOne(TEST_API_URL);
    req.flush('Server Error', { status: 500, statusText: 'Internal Server Error' });

    expect(service.getSavedBaseline()).toEqual(originalBaseline);

    service.state$.pipe(take(1)).subscribe((value) => {
      expect(value).toEqual(originalBaseline);
      done();
    });
  });

  it('cancelChanges restores the saved baseline', (done) => {
    const modified: TestState = { scenario: 'modified', value: 'changed' };

    service.saveConfig(modified);
    httpMock.expectOne(TEST_API_URL).flush({ status: 'accepted' });

    service.updateState({ scenario: 'unsaved', value: 'temp' });

    const restored = service.cancelChanges();
    expect(restored).toEqual(modified);

    service.state$.pipe(take(1)).subscribe((value) => {
      expect(value).toEqual(modified);
      done();
    });
  });

  it('getCurrentState returns the current state snapshot', () => {
    const modified: TestState = { scenario: 'modified', value: 'changed' };
    service.updateState(modified);

    const current = service.getCurrentState();
    expect(current).toEqual(modified);
    current.value = 'mutated';
    expect(service.getCurrentState().value).toBe('changed');
  });

  it('resetToDefaults restores the configured default state and resets baseline', (done) => {
    service.saveConfig({ scenario: 'modified', value: 'changed' });
    httpMock.expectOne(TEST_API_URL).flush({ status: 'accepted' });

    const restored = service.resetToDefaults();
    expect(restored).toEqual(DEFAULT_TEST_STATE);
    expect(service.getSavedBaseline()).toEqual(DEFAULT_TEST_STATE);

    service.state$.pipe(take(1)).subscribe((value) => {
      expect(value).toEqual(DEFAULT_TEST_STATE);
      done();
    });
  });
});
