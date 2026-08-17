import { CmdSelection, FieldConfig } from '../shared/models';

/**
 * A single violated `CmdConstraint`, tagged with the field it came from so
 * the host can highlight/surface it however it likes.
 */
export interface CmdValidationError {
  fieldKey: string;
  message: string;
}

/**
 * Pure CMD-scope validator. For each field whose `cmdConstraint` is active
 * (its `appliesWhen` matches the current value), checks that the number of
 * affected wheels does not exceed the field's cap.
 *
 * Affected wheels = `sides.length * wheels.length` — selecting both sides
 * and one wheel touches two wheels (one per side), which is why the limit
 * is on the product rather than on sides or wheels alone.
 *
 * Returns every violation (empty array = valid). No Angular, no side
 * effects — trivially unit-testable and reusable by any board.
 */
export function validateCmd(
  fields: ReadonlyArray<FieldConfig>,
  formValue: Record<string, string | string[]>,
  cmd: CmdSelection,
): CmdValidationError[] {
  const affectedWheels = cmd.sides.length * cmd.wheels.length;
  const errors: CmdValidationError[] = [];

  for (const field of fields) {
    const constraint = field.cmdConstraint;
    if (
      constraint &&
      constraint.appliesWhen(formValue[field.key]) &&
      affectedWheels > constraint.maxAffectedWheels
    ) {
      errors.push({ fieldKey: field.key, message: constraint.message });
    }
  }

  return errors;
}
