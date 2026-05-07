import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

import {
  BoardPostPayload,
  SystemExperimentsApiConfig,
  SystemExperimentsResponse,
  TestModePayload,
} from '../../features/system-experiments/api/api-contract';
import { SystemExperimentsApiService } from '../../features/system-experiments/api/system-experiments-api.service';
import { SystemExperimentsDataService } from '../../features/system-experiments/api/system-experiments-data.service';
import { SYSTEM_EXPERIMENTS_API_CONFIG } from '../../features/system-experiments/api/api-tokens';

/**
 * Playground-only mocks for the System Experiments shell host page.
 *
 * The real services need an HTTP backend + a WebSocket. This playground
 * has neither, so the page swaps in:
 *   - MockSystemExperimentsDataService → emits one canned `SystemExperimentsResponse`
 *   - MockSystemExperimentsApiService  → logs POSTs to the console, no network
 *
 * **Migration:** the host project does NOT take any of this. It provides
 * its own `SYSTEM_EXPERIMENTS_API_CONFIG` (real URLs) and uses the default
 * `SystemExperimentsApiService` / `SystemExperimentsDataService` from `SystemExperimentsModule`.
 * The host page in the migration target stays the same shape — it just
 * imports `SystemExperimentsModule` without these overrides.
 */

const MOCK_FRAME: SystemExperimentsResponse = {
  entities: [
    {
      entityId: 'left',
      mCommands: [
        // Each item: standardFields (Primary's 11 main) + additionalFields (Secondary's 3 8-col).
        // `videoRecType` is the only multi-select field — the values below
        // intentionally mix shapes so the grid demonstrates the full range:
        //   string         → defensive single render ('No')
        //   string[len=1]  → joined to one abbr     ('IRD')
        //   string[len=2]  → comma-joined           ('IRD,HDR')
        //   string[len=4]  → expected truncation    ('No,IRD,HDR,4k' on Secondary)
        {
          standardFields: { tff: 'not_active', mlmTransmit: 'no', videoRec: 'internal', videoRecType: 'no', mtrRec: 'no', speedPwrOnOff: 'on', forceTtl: 'normal', nuu: 'no', muDump: 'no', sendMtrTss: 'no', abort: 'no' },
          additionalFields: { whlCriticalFail: 'no', whlWarningFail: 'normal', whlFatalFail: 'no' },
        },
        {
          standardFields: { tff: 'light_active', mlmTransmit: 'yes', videoRec: 'external', videoRecType: ['ir'], mtrRec: 'yes', speedPwrOnOff: 'off', forceTtl: 'forced', nuu: 'yes', muDump: 'no', sendMtrTss: 'yes', abort: 'no' },
          additionalFields: { whlCriticalFail: 'yes', whlWarningFail: 'forced', whlFatalFail: 'no' },
        },
        {
          standardFields: { tff: 'not_active', mlmTransmit: 'no', videoRec: 'internal', videoRecType: ['ir', 'hdr'], mtrRec: 'no', speedPwrOnOff: 'on', forceTtl: 'normal', nuu: 'no', muDump: 'yes', sendMtrTss: 'no', abort: 'no' },
          additionalFields: { whlCriticalFail: 'no', whlWarningFail: 'normal', whlFatalFail: 'yes' },
        },
        {
          standardFields: { tff: 'dominate', mlmTransmit: 'yes', videoRec: 'external', videoRecType: ['no', 'ir', 'hdr', '4k'], mtrRec: 'yes', speedPwrOnOff: 'on', forceTtl: 'forced', nuu: 'yes', muDump: 'yes', sendMtrTss: 'yes', abort: 'yes' },
          additionalFields: { whlCriticalFail: 'no', whlWarningFail: 'normal', whlFatalFail: 'no' },
        },
      ],
      aCommands: { tlCriticalFail: 'no', masterTlFail: 'on', msTlFail: 'normal', tlTempFail: 'no', tlToAgCommFail: 'no' },
      gdlFail: 'normal', gdlTempFail: 'normal', antTransmitPwr: 'auto', antSelectedCmd: 'normal', gdlTransmitPwr: 'normal', uuuAntSelect: 'normal',
    },
    {
      entityId: 'right',
      mCommands: [
        {
          standardFields: { tff: 'dominate', mlmTransmit: 'no', videoRec: 'internal', videoRecType: ['ir', '4k'], mtrRec: 'yes', speedPwrOnOff: 'on', forceTtl: 'normal', nuu: 'no', muDump: 'no', sendMtrTss: 'no', abort: 'no' },
          additionalFields: { whlCriticalFail: 'no', whlWarningFail: 'normal', whlFatalFail: 'no' },
        },
        {
          standardFields: { tff: 'not_active', mlmTransmit: 'yes', videoRec: 'external', videoRecType: ['hdr', 'ir'], mtrRec: 'no', speedPwrOnOff: 'off', forceTtl: 'forced', nuu: 'yes', muDump: 'yes', sendMtrTss: 'yes', abort: 'no' },
          additionalFields: { whlCriticalFail: 'yes', whlWarningFail: 'forced', whlFatalFail: 'yes' },
        },
        {
          standardFields: { tff: 'light_active', mlmTransmit: 'no', videoRec: 'internal', videoRecType: '4k', mtrRec: 'no', speedPwrOnOff: 'on', forceTtl: 'normal', nuu: 'no', muDump: 'no', sendMtrTss: 'no', abort: 'yes' },
          additionalFields: { whlCriticalFail: 'no', whlWarningFail: 'normal', whlFatalFail: 'no' },
        },
        {
          standardFields: { tff: 'not_active', mlmTransmit: 'yes', videoRec: 'external', videoRecType: ['no', 'hdr', '4k'], mtrRec: 'yes', speedPwrOnOff: 'on', forceTtl: 'normal', nuu: 'yes', muDump: 'no', sendMtrTss: 'yes', abort: 'no' },
          additionalFields: { whlCriticalFail: 'no', whlWarningFail: 'normal', whlFatalFail: 'no' },
        },
      ],
      aCommands: { tlCriticalFail: 'yes', masterTlFail: 'off', msTlFail: 'forced', tlTempFail: 'yes', tlToAgCommFail: 'no' },
      // GDL props on entities[1] are intentionally identical to entities[0] —
      // the wire contract duplicates them and the grid only reads from [0].
      gdlFail: 'normal', gdlTempFail: 'normal', antTransmitPwr: 'auto', antSelectedCmd: 'normal', gdlTransmitPwr: 'normal', uuuAntSelect: 'normal',
    },
  ],
};

@Injectable()
export class MockSystemExperimentsDataService {
  connect(): Observable<SystemExperimentsResponse> {
    return of(MOCK_FRAME);
  }
}

@Injectable()
export class MockSystemExperimentsApiService {
  postPrimary(payload: BoardPostPayload): Observable<void> {
    // eslint-disable-next-line no-console
    console.info('[system-experiments mock] postPrimary', payload);
    return of(void 0);
  }
  postSecondary(payload: BoardPostPayload): Observable<void> {
    // eslint-disable-next-line no-console
    console.info('[system-experiments mock] postSecondary', payload);
    return of(void 0);
  }
  postDefault(): Observable<void> {
    // eslint-disable-next-line no-console
    console.info('[system-experiments mock] postDefault');
    return of(void 0);
  }
  postTestMode(payload: TestModePayload): Observable<void> {
    // eslint-disable-next-line no-console
    console.info('[system-experiments mock] postTestMode', payload);
    return of(void 0);
  }
}

export const MOCK_SYSTEM_EXPERIMENTS_API_CONFIG: SystemExperimentsApiConfig = {
  primaryPostUrl:   '/mock/system-experiments/primary',
  secondaryPostUrl: '/mock/system-experiments/secondary',
  defaultUrl:       '/mock/system-experiments/default',
  testModeUrl:      '/mock/system-experiments/test-mode',
  getUrl:           '/mock/system-experiments/get',
  wsUrl:            'ws://mock/system-experiments/ws',
};

export const MOCK_SYSTEM_EXPERIMENTS_PROVIDERS = [
  { provide: SYSTEM_EXPERIMENTS_API_CONFIG, useValue: MOCK_SYSTEM_EXPERIMENTS_API_CONFIG },
  { provide: SystemExperimentsDataService,  useClass: MockSystemExperimentsDataService },
  { provide: SystemExperimentsApiService,   useClass: MockSystemExperimentsApiService },
];
