import { HttpClient } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { concat, defer, Observable } from 'rxjs';
import { retry, shareReplay } from 'rxjs/operators';

import {
  SystemExperimentsApiConfig,
  SystemExperimentsResponse,
} from './api-contract';
import {
  SYSTEM_EXPERIMENTS_API_CONFIG,
  SYSTEM_EXPERIMENTS_WS_FACTORY,
  SystemExperimentsWebSocketFactory,
} from './api-tokens';

/**
 * Single source of truth for the right-hand grid data.
 *
 * On subscribe:
 *   1. GETs the seed `SystemExperimentsResponse` (one emission)
 *   2. Concatenates the WebSocket stream of live frames (same shape)
 *
 * The WS auto-reconnects with a 3 s delay on error (network blip, server
 * restart). Multiple subscribers share one upstream connection — the shell
 * can subscribe once and pass the stream down to both tabs without opening
 * a second socket.
 */
@Injectable()
export class SystemExperimentsDataService {

  private static readonly RECONNECT_DELAY_MS = 3000;

  private readonly stream$: Observable<SystemExperimentsResponse>;

  constructor(
    private readonly http: HttpClient,
    @Inject(SYSTEM_EXPERIMENTS_API_CONFIG) private readonly config: SystemExperimentsApiConfig,
    @Inject(SYSTEM_EXPERIMENTS_WS_FACTORY) private readonly wsFactory: SystemExperimentsWebSocketFactory,
  ) {
    const get$ = this.http.get<SystemExperimentsResponse>(this.config.getUrl);

    // `defer` ensures the factory runs (and a fresh socket opens) on every
    // subscription — including each retry attempt after a WS error.
    const ws$ = defer(() => this.wsFactory(this.config.wsUrl)).pipe(
      retry({ delay: SystemExperimentsDataService.RECONNECT_DELAY_MS }),
    );

    this.stream$ = concat(get$, ws$).pipe(
      shareReplay({ bufferSize: 1, refCount: true }),
    );
  }

  connect(): Observable<SystemExperimentsResponse> {
    return this.stream$;
  }

}
