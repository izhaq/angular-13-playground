import { FormControl, FormGroup } from '@angular/forms';

import { FieldConfig } from '../shared/models';

/**
 * Build a `FormGroup` whose controls match a board's `FieldConfig[]`, each
 * seeded to the field's `defaultValue`.
 *
 * Used by both the form components' specs and (in Phase 6) the shell when
 * it constructs each board's reactive form. Keeping the helper here means
 * the wire-up is identical in tests and production — no chance of the
 * shell building a different shape than the form expects to render.
 */
export function buildFormGroup(fields: FieldConfig[]): FormGroup {
  const controls: Record<string, FormControl> = {};
  for (const field of fields) {
    controls[field.key] = new FormControl(field.defaultValue);
  }
  return new FormGroup(controls);
}
