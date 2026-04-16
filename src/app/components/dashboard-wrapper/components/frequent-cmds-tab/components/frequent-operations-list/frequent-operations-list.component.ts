import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

import {
  DEFAULT_OPERATIONS,
  OPERATIONS_FIELDS,
  FrequentOperationsKey,
  FrequentOperationsModel,
} from './frequent-operations-list.models';

@Component({
  selector: 'app-frequent-operations-list',
  templateUrl: './frequent-operations-list.component.html',
  styleUrls: ['./frequent-operations-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FrequentOperationsListComponent {
  readonly fields = OPERATIONS_FIELDS;

  @Input() value: FrequentOperationsModel = { ...DEFAULT_OPERATIONS };
  @Input() disabled = false;

  @Output() readonly changed = new EventEmitter<FrequentOperationsModel>();

  trackByKey(_: number, field: { key: string }): string {
    return field.key;
  }

  getStringValue(key: FrequentOperationsKey): string {
    return this.value[key] as string;
  }

  getArrayValue(key: FrequentOperationsKey): string[] {
    return this.value[key] as string[];
  }

  onControlChanged(key: FrequentOperationsKey, newValue: string | string[]): void {
    this.value = { ...this.value, [key]: newValue };
    this.changed.emit(this.value);
  }
}
