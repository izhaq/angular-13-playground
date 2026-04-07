import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
} from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import {
  CommandPair,
  DashboardFormValue,
  LeftPanelFormPayload,
  OperationsValue,
} from '../../models/dashboard-form.models';
import { DEFAULT_OPERATIONS_VALUE } from '../operations-form-list/operations-form-list.models';

@Component({
  selector: 'app-left-panel',
  templateUrl: './left-panel.component.html',
  styleUrls: ['./left-panel.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LeftPanelComponent implements OnInit, OnDestroy {
  @Input() set formValue(value: DashboardFormValue | null) {
    if (!value) {
      return;
    }
    const current = this.form.value;
    if (
      current.commands !== value.commands ||
      current.operations !== value.operations
    ) {
      this.form.patchValue(
        { commands: value.commands, operations: value.operations },
        { emitEvent: false },
      );
    }
  }

  @Output() formChanged = new EventEmitter<LeftPanelFormPayload>();
  @Output() saved = new EventEmitter<LeftPanelFormPayload>();
  @Output() cancelled = new EventEmitter<void>();

  form = new FormGroup({
    commands: new FormControl(null),
    operations: new FormControl(null),
  });

  private readonly destroy$ = new Subject<void>();

  ngOnInit(): void {
    this.form.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((val) => {
        this.formChanged.emit(this.buildPayload(val));
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSave(): void {
    this.saved.emit(this.buildPayload(this.form.value));
  }

  onCancel(): void {
    this.cancelled.emit();
  }

  private buildPayload(val: {
    commands?: CommandPair | null;
    operations?: OperationsValue | null;
  }): LeftPanelFormPayload {
    return {
      commands: val.commands ?? { cmd1: '', cmd2: '' },
      operations: val.operations ?? { ...DEFAULT_OPERATIONS_VALUE },
    };
  }
}
