import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { RARE_DEFAULT_STATE } from '../models/rare-dashboard-defaults';
import { RareDashboardState } from '../models/rare-dashboard.models';

@Injectable({
  providedIn: 'root',
})
export class RareStateService {
  private readonly stateSubject = new BehaviorSubject<RareDashboardState>(
    RARE_DEFAULT_STATE
  );

  private savedBaseline: RareDashboardState = { ...RARE_DEFAULT_STATE };

  readonly state$ = this.stateSubject.asObservable();

  constructor(private readonly http: HttpClient) {}

  updateState(value: RareDashboardState): void {
    this.stateSubject.next(value);
  }

  saveConfig(value: RareDashboardState): void {
    const previousBaseline = { ...this.savedBaseline };
    this.savedBaseline = { ...value };
    this.stateSubject.next(value);

    this.http.post<{ status: string }>('/api/rare-config', value).subscribe({
      next: (res) => console.log('[RareStateService] Config saved:', res.status),
      error: (err) => {
        console.error('[RareStateService] Save failed:', err.message);
        this.savedBaseline = previousBaseline;
        this.stateSubject.next(previousBaseline);
      },
    });
  }

  cancelChanges(): RareDashboardState {
    this.stateSubject.next({ ...this.savedBaseline });
    return { ...this.savedBaseline };
  }

  resetToDefaults(): RareDashboardState {
    const defaults = { ...RARE_DEFAULT_STATE };
    this.savedBaseline = { ...RARE_DEFAULT_STATE };
    this.stateSubject.next(defaults);
    return defaults;
  }

  getSavedBaseline(): RareDashboardState {
    return { ...this.savedBaseline };
  }
}
