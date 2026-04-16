import { HttpClient } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { TabStateConfig, TAB_STATE_CONFIG } from './tab-state.config';

@Injectable()
export class TabStateService<T> {
  private readonly stateSubject: BehaviorSubject<T>;
  private savedBaseline: T;

  readonly state$: Observable<T>;

  constructor(
    private readonly http: HttpClient,
    @Inject(TAB_STATE_CONFIG) private readonly config: TabStateConfig<T>,
  ) {
    this.savedBaseline = { ...config.defaultState };
    this.stateSubject = new BehaviorSubject<T>(config.defaultState);
    this.state$ = this.stateSubject.asObservable();
  }

  updateState(value: T): void {
    this.stateSubject.next(value);
  }

  saveConfig(value: T): void {
    const previousBaseline = { ...this.savedBaseline };
    this.savedBaseline = { ...value };
    this.stateSubject.next(value);

    this.http.post<{ status: string }>(this.config.apiUrl, value).subscribe({
      next: (res) => console.log(`[TabStateService] Config saved:`, res.status),
      error: (err) => {
        console.error(`[TabStateService] Save failed:`, err.message);
        this.savedBaseline = previousBaseline;
        this.stateSubject.next(previousBaseline);
      },
    });
  }

  cancelChanges(): T {
    this.stateSubject.next({ ...this.savedBaseline });
    return { ...this.savedBaseline };
  }

  resetToDefaults(): T {
    const defaults = { ...this.config.defaultState };
    this.savedBaseline = { ...this.config.defaultState };
    this.stateSubject.next(defaults);
    return defaults;
  }

  getCurrentState(): T {
    return { ...this.stateSubject.getValue() };
  }

  getSavedBaseline(): T {
    return { ...this.savedBaseline };
  }
}
