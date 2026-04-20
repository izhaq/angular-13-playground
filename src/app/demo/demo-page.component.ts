import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';

import { DropdownOption } from '../components/app-dropdown/app-dropdown.models';

@Component({
  selector: 'app-demo-page',
  templateUrl: './demo-page.component.html',
  styleUrls: ['./demo-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DemoPageComponent {
  readonly fruits: DropdownOption[] = [
    { value: 'apple', label: 'Apple' },
    { value: 'banana', label: 'Banana' },
    { value: 'cherry', label: 'Cherry' },
    { value: 'date', label: 'Date' },
  ];

  readonly tags: DropdownOption[] = [
    { value: 'red', label: 'Red' },
    { value: 'green', label: 'Green' },
    { value: 'blue', label: 'Blue' },
    { value: 'yellow', label: 'Yellow' },
  ];

  standaloneSingle = 'banana';
  ngModelSingle = 'apple';
  standaloneMulti: string[] = ['red', 'blue'];

  readonly form = new FormGroup({
    fruit: new FormControl('cherry'),
    tags: new FormControl(['green']),
  });

  resetForm(): void {
    this.form.reset({ fruit: 'cherry', tags: ['green'] });
  }

  toggleFormDisabled(): void {
    this.form.disabled ? this.form.enable() : this.form.disable();
  }
}
