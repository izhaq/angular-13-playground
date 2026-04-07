import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { DEFAULT_FORM_VALUE } from '../models/dashboard-defaults';
import { DashboardFormValue } from '../models/dashboard-form.models';

@Injectable({
  providedIn: 'root',
})
export class DashboardFormService {
  private readonly formStateSubject = new BehaviorSubject<DashboardFormValue>(
    DEFAULT_FORM_VALUE
  );

  private savedBaseline: DashboardFormValue = { ...DEFAULT_FORM_VALUE };

  readonly formState$ = this.formStateSubject.asObservable();

  updateFormState(value: DashboardFormValue): void {
    this.formStateSubject.next(value);
  }

  saveConfig(value: DashboardFormValue): void {
    this.savedBaseline = { ...value };
    this.formStateSubject.next(value);
    // TODO: POST to mock API — will trigger server-side processing
    // that pushes WebSocket FieldUpdate messages to StatusGridService
  }

  cancelChanges(): DashboardFormValue {
    this.formStateSubject.next({ ...this.savedBaseline });
    return { ...this.savedBaseline };
  }

  resetToDefaults(): DashboardFormValue {
    this.savedBaseline = { ...DEFAULT_FORM_VALUE };
    this.formStateSubject.next({ ...DEFAULT_FORM_VALUE });
    return { ...DEFAULT_FORM_VALUE };
  }

  getSavedBaseline(): DashboardFormValue {
    return { ...this.savedBaseline };
  }
}
