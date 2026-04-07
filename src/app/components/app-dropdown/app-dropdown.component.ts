import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, Input, Output } from '@angular/core';
import { MatSelectChange } from '@angular/material/select';

import { DROPDOWN_HOST, DropdownHost, DropdownOption } from './app-dropdown.models';

@Component({
  selector: 'app-dropdown',
  templateUrl: './app-dropdown.component.html',
  styleUrls: ['./app-dropdown.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{ provide: DROPDOWN_HOST, useExisting: AppDropdownComponent }],
})
export class AppDropdownComponent implements DropdownHost<string> {
  @Input() options: DropdownOption[] = [];
  @Input() label = '';
  @Input() placeholder = '';
  @Input() disabled = false;

  @Output() changed = new EventEmitter<string>();

  private _value = '';

  constructor(private readonly cdr: ChangeDetectorRef) {}

  @Input()
  get value(): string {
    return this._value;
  }
  set value(val: string) {
    if (this._value !== val) {
      this._value = val;
      this.cdr.markForCheck();
    }
  }

  onSelectionChange(event: MatSelectChange): void {
    this.value = event.value as string;
    this.changed.emit(this.value);
  }
}
