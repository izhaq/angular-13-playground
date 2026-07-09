import { UntypedFormControl, UntypedFormGroup } from '@angular/forms';

import { FieldConfig } from '../shared/models';

/** Build a `FormGroup` whose controls match a board's `FieldConfig[]`, each seeded to `defaultValue`. */
export function buildFormGroup(fields: FieldConfig[]): UntypedFormGroup {
  const controls: Record<string, UntypedFormControl> = {};
  for (const field of fields) {
    controls[field.key] = new UntypedFormControl(field.defaultValue);
  }
  return new UntypedFormGroup(controls);
}
