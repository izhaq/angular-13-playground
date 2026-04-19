import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, Input, Output } from '@angular/core';
import { MatSelectChange } from '@angular/material/select';

import { DROPDOWN_HOST, DropdownHost, DropdownOption } from '../app-dropdown/app-dropdown.models';

@Component({
  selector: 'app-multi-dropdown',
  templateUrl: './app-multi-dropdown.component.html',
  styleUrls: ['./app-multi-dropdown.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{ provide: DROPDOWN_HOST, useExisting: AppMultiDropdownComponent }],
})
export class AppMultiDropdownComponent implements DropdownHost<string[]> {
  @Input() options: DropdownOption[] = [];
  @Input() label = '';
  @Input() placeholder = 'Select';
  @Input() disabled = false;
  @Input() testId = '';

  @Output() readonly changed = new EventEmitter<string[]>();

  private _value: string[] = [];

  constructor(private readonly cdr: ChangeDetectorRef) {}

  @Input()
  get value(): string[] {
    return this._value;
  }
  set value(val: string[]) {
    if (this._value !== val) {
      this._value = val;
      this.cdr.markForCheck();
    }
  }

  onSelectionChange(event: MatSelectChange): void {
    this.value = event.value;
    this.changed.emit(this.value);
  }
}
