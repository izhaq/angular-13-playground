import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { Subject } from 'rxjs';

import {
  SystemExperimentsApiConfig,
  SystemExperimentsResponse,
} from './api-contract';
import {
  SYSTEM_EXPERIMENTS_API_CONFIG,
  SYSTEM_EXPERIMENTS_WS_FACTORY,
  SystemExperimentsWebSocketFactory,
} from './api-tokens';
import { SystemExperimentsDataService } from './system-experiments-data.service';

const TEST_API_CONFIG: SystemExperimentsApiConfig = {
  primaryPostUrl:   'https://api.test/system-experiments/primary',
  secondaryPostUrl: 'https://api.test/system-experiments/secondary',
  getUrl:           'https://api.test/system-experiments/state',
  wsUrl:            'wss://api.test/system-experiments/stream',
};

function emptyResponse(tag: string): SystemExperimentsResponse {
  // The exact shape doesn't matter for these tests — we only care about
  // identity ("did this frame flow through?"), so we use a tag for clarity.
  return { entities: [
    { entityId: 'left',  mCommands: [{} as any, {} as any, {} as any, {} as any], aCommands: { tag } as any, gdlFail: '', gdlTempFail: '', antTransmitPwr: '', antSelectedCmd: '', gdlTransmitPwr: '', uuuAntSelect: '' },
    { entityId: 'right', mCommands: [{} as any, {} as any, {} as any, {} as any], aCommands: {} as any,      gdlFail: '', gdlTempFail: '', antTransmitPwr: '', antSelectedCmd: '', gdlTransmitPwr: '', uuuAntSelect: '' },
  ]};
}

describe('SystemExperimentsDataService', () => {

  let service: SystemExperimentsDataService;
  let httpMock: HttpTestingController;
  let openSockets: Subject<SystemExperimentsResponse>[];
  let socketUrls: string[];

  function makeFactory(): SystemExperimentsWebSocketFactory {
    return (url: string) => {
      const sock = new Subject<SystemExperimentsResponse>();
      openSockets.push(sock);
      socketUrls.push(url);
      return sock.asObservable();
    };
  }

  beforeEach(() => {
    openSockets = [];
    socketUrls = [];
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        SystemExperimentsDataService,
        { provide: SYSTEM_EXPERIMENTS_API_CONFIG, useValue: TEST_API_CONFIG },
        { provide: SYSTEM_EXPERIMENTS_WS_FACTORY, useValue: makeFactory() },
      ],
    });
    service = TestBed.inject(SystemExperimentsDataService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('emits the GET response first, then merges WebSocket frames', () => {
    const seed = emptyResponse('seed');
    const live = emptyResponse('live');

    const emitted: SystemExperimentsResponse[] = [];
    service.connect().subscribe((r) => emitted.push(r));

    httpMock.expectOne(TEST_API_CONFIG.getUrl).flush(seed);
    expect(emitted.length).toBe(1);
    expect(emitted[0]).toBe(seed);

    openSockets[0].next(live);
    expect(emitted.length).toBe(2);
    expect(emitted[1]).toBe(live);
  });

  it('opens the WebSocket against the configured wsUrl, exactly once per stream', () => {
    service.connect().subscribe();
    httpMock.expectOne(TEST_API_CONFIG.getUrl).flush(emptyResponse('seed'));

    expect(socketUrls).toEqual([TEST_API_CONFIG.wsUrl]);
  });

  it('reconnects after WebSocket error (with delay) and resumes streaming', fakeAsync(() => {
    const seed   = emptyResponse('seed');
    const before = emptyResponse('before-error');
    const after  = emptyResponse('after-reconnect');

    const emitted: SystemExperimentsResponse[] = [];
    service.connect().subscribe({ next: (r) => emitted.push(r) });

    httpMock.expectOne(TEST_API_CONFIG.getUrl).flush(seed);
    openSockets[0].next(before);
    openSockets[0].error(new Error('socket dropped'));

    // Retry waits for the configured delay before reopening.
    tick(3000);

    expect(openSockets.length).toBe(2);
    openSockets[1].next(after);

    expect(emitted).toEqual([seed, before, after]);
  }));

  it('shares one upstream connection across multiple subscribers', () => {
    service.connect().subscribe();
    service.connect().subscribe();

    expect(httpMock.match(TEST_API_CONFIG.getUrl).length).toBe(1);
  });

});
