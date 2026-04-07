import { ChangeDetectionStrategy, Component, forwardRef, OnDestroy, OnInit } from '@angular/core';
import { ControlValueAccessor, FormControl, FormGroup, NG_VALUE_ACCESSOR } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { CMD_OPTIONS, CommandPair } from './cmd-form-panel.models';

@Component({
  selector: 'app-cmd-form-panel',
  templateUrl: './cmd-form-panel.component.html',
  styleUrls: ['./cmd-form-panel.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CmdFormPanelComponent),
      multi: true,
    },
  ],
})
export class CmdFormPanelComponent implements ControlValueAccessor, OnInit, OnDestroy {
  readonly cmdOptions = CMD_OPTIONS;

  readonly form = new FormGroup({
    cmd1: new FormControl(''),
    cmd2: new FormControl(''),
  });

  private onChange: (value: CommandPair) => void = () => undefined;
  private onTouched: () => void = () => undefined;
  private readonly destroy$ = new Subject<void>();

  ngOnInit(): void {
    this.form.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((val) => {
        this.onChange({ cmd1: val.cmd1 ?? '', cmd2: val.cmd2 ?? '' });
        this.onTouched();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  writeValue(val: CommandPair | null): void {
    this.form.setValue(
      { cmd1: val?.cmd1 ?? '', cmd2: val?.cmd2 ?? '' },
      { emitEvent: false },
    );
  }

  registerOnChange(fn: (value: CommandPair) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    isDisabled ? this.form.disable({ emitEvent: false }) : this.form.enable({ emitEvent: false });
  }
}
