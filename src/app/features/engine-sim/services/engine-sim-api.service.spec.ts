import { TestBed } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';

import {
  BoardPostPayload,
  EngineSimApiConfig,
} from '../shared/engine-sim.api-contract';
import { ENGINE_SIM_API_CONFIG } from '../shared/engine-sim.tokens';
import { EngineSimApiService } from './engine-sim-api.service';

const TEST_API_CONFIG: EngineSimApiConfig = {
  primaryPostUrl:   'https://api.test/engine-sim/primary',
  secondaryPostUrl: 'https://api.test/engine-sim/secondary',
  getUrl:           'https://api.test/engine-sim/state',
  wsUrl:            'wss://api.test/engine-sim/stream',
};

const SAMPLE_PAYLOAD: BoardPostPayload = {
  sides:  ['left', 'right'],
  wheels: ['1', '3'],
  fields: { tff: 'not_active', mlmTransmit: 'no', videoRecType: ['no', 'ir'] },
};

describe('EngineSimApiService', () => {

  let service: EngineSimApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        EngineSimApiService,
        { provide: ENGINE_SIM_API_CONFIG, useValue: TEST_API_CONFIG },
      ],
    });
    service = TestBed.inject(EngineSimApiService);
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

});
