import { TestBed } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';

import {
  BoardPostPayload,
  SystemExperimentsApiConfig,
} from './api-contract';
import { SYSTEM_EXPERIMENTS_API_CONFIG } from './api-tokens';
import { SystemExperimentsApiService } from './system-experiments-api.service';

const TEST_API_CONFIG: SystemExperimentsApiConfig = {
  primaryPostUrl:   'https://api.test/system-experiments/primary',
  secondaryPostUrl: 'https://api.test/system-experiments/secondary',
  defaultUrl:       'https://api.test/system-experiments/default',
  testModeUrl:      'https://api.test/system-experiments/test-mode',
  getUrl:           'https://api.test/system-experiments/state',
  wsUrl:            'wss://api.test/system-experiments/stream',
};

const SAMPLE_PAYLOAD: BoardPostPayload = {
  sides:  ['left', 'right'],
  wheels: ['1', '3'],
  fields: { tff: 'not_active', mlmTransmit: 'no', videoRecType: ['no', 'ir'] },
};

describe('SystemExperimentsApiService', () => {

  let service: SystemExperimentsApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        SystemExperimentsApiService,
        { provide: SYSTEM_EXPERIMENTS_API_CONFIG, useValue: TEST_API_CONFIG },
      ],
    });
    service = TestBed.inject(SystemExperimentsApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('postPrimary POSTs the payload to the configured primary URL', () => {
    service.postPrimary(SAMPLE_PAYLOAD).subscribe();

    const req = httpMock.expectOne(TEST_API_CONFIG.primaryPostUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(SAMPLE_PAYLOAD);
    req.flush(null);
  });

  it('postSecondary POSTs the payload to the configured secondary URL', () => {
    service.postSecondary(SAMPLE_PAYLOAD).subscribe();

    const req = httpMock.expectOne(TEST_API_CONFIG.secondaryPostUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(SAMPLE_PAYLOAD);
    req.flush(null);
  });

  it('does not hit the network until the returned observable is subscribed', () => {
    service.postPrimary(SAMPLE_PAYLOAD); // no subscribe
    expect(httpMock.match(TEST_API_CONFIG.primaryPostUrl).length).toBe(0);
  });

  // ---------------------------------------------------------------------------
  // postDefault — single global "reset to defaults" endpoint, empty body.
  // ---------------------------------------------------------------------------

  it('postDefault POSTs an empty body to the configured defaultUrl', () => {
    service.postDefault().subscribe();

    const req = httpMock.expectOne(TEST_API_CONFIG.defaultUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({});
    req.flush(null);
  });

  it('postDefault is lazy — no request until subscription', () => {
    service.postDefault();
    expect(httpMock.match(TEST_API_CONFIG.defaultUrl).length).toBe(0);
  });

  // ---------------------------------------------------------------------------
  // postTestMode — POSTs the chosen mode on every Sys Mode dropdown change.
  // ---------------------------------------------------------------------------

  it('postTestMode POSTs the payload to the configured testModeUrl', () => {
    service.postTestMode({ mode: 'inactive' }).subscribe();

    const req = httpMock.expectOne(TEST_API_CONFIG.testModeUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ mode: 'inactive' });
    req.flush(null);
  });

  it('postTestMode is lazy — no request until subscription', () => {
    service.postTestMode({ mode: 'active' });
    expect(httpMock.match(TEST_API_CONFIG.testModeUrl).length).toBe(0);
  });

});
