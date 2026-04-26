import { HttpClient } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import {
  BoardPostPayload,
  SystemExperimentsApiConfig,
  TestModePayload,
} from './api-contract';
import { SYSTEM_EXPERIMENTS_API_CONFIG } from './api-tokens';

/** POST endpoints for the feature. URLs come from `SYSTEM_EXPERIMENTS_API_CONFIG`. */
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

 postDefault(): Observable<void> {
    return this.http.post<void>(this.config.defaultUrl, {});
  }

  postTestMode(payload: TestModePayload): Observable<void> {
    return this.http.post<void>(this.config.testModeUrl, payload);
  }

}
