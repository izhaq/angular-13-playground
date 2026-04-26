import { FormControl, FormGroup } from '@angular/forms';

import { FieldConfig } from '../shared/models';

/**
 * Build a `FormGroup` whose controls match a board's `FieldConfig[]`, each
 * seeded to the field's `defaultValue`.
 *
 * Consumers (Phase 8 shape):
 *   - `PrimaryCommandsBoardService` / `SecondaryCommandsBoardService`
 *     materialise their `formGroup` field via this primitive against
 *     the sibling fields module's `_ALL_FIELDS` array (production path).
 *   - Both form component specs' host wrappers use it for the same
 *     reason — drift between the form's declared shape and the
 *     service's seed surfaces here.
 *   - `DemoPageComponent` uses it to preview each form standalone.
 *
 * Centralising the primitive here means every board materialises its
 * form the same way (single `new FormControl` policy, single
 * `defaultValue` mapping) even though each board's field list lives
 * in its own module.
 */
export function buildFormGroup(fields: FieldConfig[]): FormGroup {
  const controls: Record<string, FormControl> = {};
  for (const field of fields) {
    controls[field.key] = new FormControl(field.defaultValue);
  }
  return new FormGroup(controls);
}
