import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { DEFAULT_STATE } from '../models/dashboard-defaults';
import { DashboardState } from '../models/dashboard.models';

@Injectable({
  providedIn: 'root',
})
export class DashboardStateService {
  private readonly stateSubject = new BehaviorSubject<DashboardState>(
    DEFAULT_STATE
  );

  private savedBaseline: DashboardState = { ...DEFAULT_STATE };

  readonly state$ = this.stateSubject.asObservable();

  updateState(value: DashboardState): void {
    this.stateSubject.next(value);
  }

  saveConfig(value: DashboardState): void {
    this.savedBaseline = { ...value };
    this.stateSubject.next(value);
    // TODO: POST to mock API — will trigger server-side processing
    // that pushes WebSocket FieldUpdate messages to StatusGridService
  }

  cancelChanges(): DashboardState {
    this.stateSubject.next({ ...this.savedBaseline });
    return { ...this.savedBaseline };
  }

  resetToDefaults(): DashboardState {
    const defaults = { ...DEFAULT_STATE };
    this.savedBaseline = { ...DEFAULT_STATE };
    this.stateSubject.next(defaults);
    return defaults;
  }

  getSavedBaseline(): DashboardState {
    return { ...this.savedBaseline };
  }
}
