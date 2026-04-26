import { FormControl, FormGroup } from '@angular/forms';

import { FieldConfig } from '../shared/models';

/** Build a `FormGroup` whose controls match a board's `FieldConfig[]`, each seeded to `defaultValue`. */
export function buildFormGroup(fields: FieldConfig[]): FormGroup {
  const controls: Record<string, FormControl> = {};
  for (const field of fields) {
    controls[field.key] = new FormControl(field.defaultValue);
  }
  return new FormGroup(controls);
}
