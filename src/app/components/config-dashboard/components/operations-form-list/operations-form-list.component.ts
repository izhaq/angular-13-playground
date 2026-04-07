import { ChangeDetectionStrategy, Component, forwardRef, OnDestroy, OnInit } from '@angular/core';
import { ControlValueAccessor, FormControl, FormGroup, NG_VALUE_ACCESSOR } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import {
  DEFAULT_OPERATIONS_VALUE,
  OPERATION_FIELDS,
  OperationFieldConfig,
  OperationsValue,
} from './operations-form-list.models';

@Component({
  selector: 'app-operations-form-list',
  templateUrl: './operations-form-list.component.html',
  styleUrls: ['./operations-form-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => OperationsFormListComponent),
      multi: true,
    },
  ],
})
export class OperationsFormListComponent implements ControlValueAccessor, OnInit, OnDestroy {
  readonly opr1 = OPERATION_FIELDS[0];
  readonly opr2 = OPERATION_FIELDS[1];
  readonly opr3 = OPERATION_FIELDS[2];
  readonly opr4 = OPERATION_FIELDS[3];
  readonly opr5 = OPERATION_FIELDS[4];
  readonly opr6 = OPERATION_FIELDS[5];
  readonly opr7 = OPERATION_FIELDS[6];
  readonly opr8 = OPERATION_FIELDS[7];
  readonly opr9 = OPERATION_FIELDS[8];
  readonly opr10 = OPERATION_FIELDS[9];

  readonly form = new FormGroup({
    opr1: new FormControl(''),
    opr2: new FormControl(''),
    opr3: new FormControl(''),
    opr4: new FormControl(''),
    opr5: new FormControl(''),
    opr6: new FormControl(''),
    opr7: new FormControl(''),
    opr8: new FormControl(''),
    opr9: new FormControl(''),
    opr10: new FormControl(''),
  });

  private onChange: (value: OperationsValue) => void = () => undefined;
  private onTouched: () => void = () => undefined;
  private readonly destroy$ = new Subject<void>();

  ngOnInit(): void {
    this.form.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((val) => {
        this.onChange(this.normalizeValue(val));
        this.onTouched();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  writeValue(val: OperationsValue | null): void {
    this.form.setValue(val ?? { ...DEFAULT_OPERATIONS_VALUE }, { emitEvent: false });
  }

  registerOnChange(fn: (value: OperationsValue) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    isDisabled
      ? this.form.disable({ emitEvent: false })
      : this.form.enable({ emitEvent: false });
  }

  private normalizeValue(val: Record<string, unknown>): OperationsValue {
    return {
      opr1: (val['opr1'] as string) ?? '',
      opr2: (val['opr2'] as string) ?? '',
      opr3: (val['opr3'] as string) ?? '',
      opr4: (val['opr4'] as string) ?? '',
      opr5: (val['opr5'] as string) ?? '',
      opr6: (val['opr6'] as string) ?? '',
      opr7: (val['opr7'] as string) ?? '',
      opr8: (val['opr8'] as string) ?? '',
      opr9: (val['opr9'] as string) ?? '',
      opr10: (val['opr10'] as string) ?? '',
    };
  }
}
