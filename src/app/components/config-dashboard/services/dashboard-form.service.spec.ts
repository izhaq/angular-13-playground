import { TestBed } from '@angular/core/testing';
import { take } from 'rxjs/operators';
import { DEFAULT_FORM_VALUE } from '../models/dashboard-defaults';
import { DashboardFormValue, OperationsValue } from '../models/dashboard-form.models';
import { DashboardFormService } from './dashboard-form.service';

function fillOperations(value: string): OperationsValue {
  return {
    opr1: value, opr2: value, opr3: value, opr4: value, opr5: value,
    opr6: value, opr7: value, opr8: value, opr9: value, opr10: value,
  };
}

describe('DashboardFormService', () => {
  let service: DashboardFormService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DashboardFormService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('initial formState$ emits DEFAULT_FORM_VALUE', (done) => {
    service.formState$.pipe(take(1)).subscribe((value) => {
      expect(value).toEqual(DEFAULT_FORM_VALUE);
      done();
    });
  });

  it('updateFormState causes formState$ to emit the new value', (done) => {
    const next: DashboardFormValue = {
      action: 'action-2',
      commands: { cmd1: 'cmd-opt-2', cmd2: 'cmd-opt-3' },
      operations: fillOperations('option-2'),
    };

    service.formState$.pipe(take(2)).subscribe({
      next: (value) => {
        if (value.action === 'action-2') {
          expect(value).toEqual(next);
          done();
        }
      },
    });

    service.updateFormState(next);
  });

  it('saveConfig updates the saved baseline', () => {
    const modified: DashboardFormValue = {
      action: 'action-3',
      commands: { cmd1: 'cmd-opt-2', cmd2: 'cmd-opt-1' },
      operations: fillOperations('option-3'),
    };

    service.saveConfig(modified);
    expect(service.getSavedBaseline()).toEqual(modified);
  });

  it('cancelChanges restores the saved baseline', (done) => {
    const modified: DashboardFormValue = {
      action: 'action-2',
      commands: { cmd1: 'cmd-opt-2', cmd2: 'cmd-opt-3' },
      operations: fillOperations('option-2'),
    };

    service.saveConfig(modified);
    service.updateFormState({
      ...modified,
      action: 'action-3',
    });

    const restored = service.cancelChanges();
    expect(restored).toEqual(modified);

    service.formState$.pipe(take(1)).subscribe((value) => {
      expect(value).toEqual(modified);
      done();
    });
  });

  it('resetToDefaults restores DEFAULT_FORM_VALUE and resets baseline', (done) => {
    service.saveConfig({
      action: 'action-2',
      commands: { cmd1: 'cmd-opt-2', cmd2: 'cmd-opt-3' },
      operations: fillOperations('option-2'),
    });

    const restored = service.resetToDefaults();
    expect(restored).toEqual(DEFAULT_FORM_VALUE);
    expect(service.getSavedBaseline()).toEqual(DEFAULT_FORM_VALUE);

    service.formState$.pipe(take(1)).subscribe((value) => {
      expect(value).toEqual(DEFAULT_FORM_VALUE);
      done();
    });
  });
});
