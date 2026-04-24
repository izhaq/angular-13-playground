import { HttpClient } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import {
  BoardPostPayload,
  SystemExperimentsApiConfig,
} from './api-contract';
import { SYSTEM_EXPERIMENTS_API_CONFIG } from './api-tokens';

/**
 * POST endpoint for each board. URLs come from the injected `SYSTEM_EXPERIMENTS_API_CONFIG`
 * token so the host project can wire its own routes at module setup — no hardcoded
 * URLs, no environment-file coupling.
 */
@Injectable()
export class SystemExperimentsApiService {

  constructor(
    private readonly http: HttpClient,
    @Inject(SYSTEM_EXPERIMENTS_API_CONFIG) private readonly config: SystemExperimentsApiConfig,
  ) {}

  postPrimary(payload: BoardPostPayload): Observable<void> {
    return this.http.post<void>(this.config.primaryPostUrl, payload);
  }

  postSecondary(payload: BoardPostPayload): Observable<void> {
    return this.http.post<void>(this.config.secondaryPostUrl, payload);
  }

}
