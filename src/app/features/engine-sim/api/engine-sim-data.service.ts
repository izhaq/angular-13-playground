import { HttpClient } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { concat, defer, Observable } from 'rxjs';
import { retry, shareReplay } from 'rxjs/operators';

import {
  EngineSimApiConfig,
  EngineSimResponse,
} from './api-contract';
import {
  ENGINE_SIM_API_CONFIG,
  ENGINE_SIM_WS_FACTORY,
  EngineSimWebSocketFactory,
} from './api-tokens';

/**
 * Single source of truth for the right-hand grid data.
 *
 * On subscribe:
 *   1. GETs the seed `EngineSimResponse` (one emission)
 *   2. Concatenates the WebSocket stream of live frames (same shape)
 *
 * The WS auto-reconnects with a 3 s delay on error (network blip, server
 * restart). Multiple subscribers share one upstream connection — the shell
 * can subscribe once and pass the stream down to both tabs without opening
 * a second socket.
 */
@Injectable()
export class EngineSimDataService {

  private static readonly RECONNECT_DELAY_MS = 3000;

  private readonly stream$: Observable<EngineSimResponse>;

  constructor(
    private readonly http: HttpClient,
    @Inject(ENGINE_SIM_API_CONFIG) private readonly config: EngineSimApiConfig,
    @Inject(ENGINE_SIM_WS_FACTORY) private readonly wsFactory: EngineSimWebSocketFactory,
  ) {
    const get$ = this.http.get<EngineSimResponse>(this.config.getUrl);

    // `defer` ensures the factory runs (and a fresh socket opens) on every
    // subscription — including each retry attempt after a WS error.
    const ws$ = defer(() => this.wsFactory(this.config.wsUrl)).pipe(
      retry({ delay: EngineSimDataService.RECONNECT_DELAY_MS }),
    );

    this.stream$ = concat(get$, ws$).pipe(
      shareReplay({ bufferSize: 1, refCount: true }),
    );
  }

  connect(): Observable<EngineSimResponse> {
    return this.stream$;
  }

}
