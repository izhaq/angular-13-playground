import { DropdownOption } from '../_external/ui-primitives';
import { GridColId } from './ids';
import { Side, Wheel } from './option-values';

/**
 * Internal view models — types that exist only inside the feature.
 * Wire-crossing types live in `api/api-contract.ts`.
 */

export interface CmdSelection {
  sides: Side[];
  wheels: Wheel[];
}

export interface GridColumn {
  id: GridColId;
  label: string;
}

export interface GridRow {
  fieldKey: string;
  label: string;
  values: Record<string, string>;
}

/**
 * A dropdown option that is also rendered in the status grid. Extends the
 * generic DropdownOption by making `abbr` required — the grid uses `abbr`
 * as the cell text, so a missing one would render blank.
 */
export type LabeledOption = DropdownOption & { abbr: string };

/**
 * Optional per-field rule constraining the CMD scope this field may be
 * applied to. Generic on purpose: any field can declare one, the framework
 * enforces it on Apply (see `boards/validate-cmd.ts`), and adding a new
 * constrained field is a config-only change.
 *
 * The unit is **affected wheels** = `sides.length * wheels.length` (both
 * sides + one wheel targets two wheels, one per side). Example: `abort`
 * declares `maxAffectedWheels: 1` — the backend can abort only a single
 * wheel at a time.
 */
export interface CmdConstraint {
  /** Rule is active only when the field's current value matches. */
  appliesWhen: (value: string | string[]) => boolean;
  /** Upper bound on affected wheels (`sides * wheels`) when active. */
  maxAffectedWheels: number;
  /** Message surfaced to the host when the rule is violated. */
  message: string;
}

// No `inGrid` flag — form-only fields just stay out of `MAIN_FIELDS`.
interface BaseFieldConfig {
  key: string;
  label: string;
  options: LabeledOption[];
  /** When set, gates Apply on the CMD scope (see `CmdConstraint`). */
  cmdConstraint?: CmdConstraint;
}

export interface SingleSelectField extends BaseFieldConfig {
  type: 'single';
  defaultValue: string;
}

export interface MultiSelectField extends BaseFieldConfig {
  type: 'multi';
  defaultValue: string[];
}

export type FieldConfig = SingleSelectField | MultiSelectField;
export type FieldType = FieldConfig['type'];
