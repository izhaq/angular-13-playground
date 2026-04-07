import { Directive, forwardRef, Inject, OnDestroy, OnInit } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { Subscription } from 'rxjs';

import { DROPDOWN_HOST, DropdownHost } from '../app-dropdown/app-dropdown.models';

@Directive({
  selector:
    'app-dropdown[formControlName], app-dropdown[formControl], app-dropdown[ngModel],' +
    'app-multi-dropdown[formControlName], app-multi-dropdown[formControl], app-multi-dropdown[ngModel]',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => AppDropdownCvaDirective),
      multi: true,
    },
  ],
})
export class AppDropdownCvaDirective implements ControlValueAccessor, OnInit, OnDestroy {
  private onChangeFn: (value: string | string[]) => void = () => undefined;
  private onTouchedFn: () => void = () => undefined;
  private changeSub!: Subscription;

  constructor(@Inject(DROPDOWN_HOST) private host: DropdownHost<string | string[]>) {}

  ngOnInit(): void {
    this.changeSub = this.host.changed.subscribe((val) => {
      this.onChangeFn(val);
      this.onTouchedFn();
    });
  }

  ngOnDestroy(): void {
    this.changeSub?.unsubscribe();
  }

  writeValue(val: string | string[] | null): void {
    this.host.value = val ?? (Array.isArray(this.host.value) ? [] : '');
  }

  registerOnChange(fn: (value: string | string[]) => void): void {
    this.onChangeFn = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouchedFn = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.host.disabled = isDisabled;
  }
}
