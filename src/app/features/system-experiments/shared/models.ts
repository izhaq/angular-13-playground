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

// No `inGrid` flag — form-only fields just stay out of `MAIN_FIELDS`.
// Apply-time validation is NOT declared here — it lives in board-level rule
// lists (see `boards/validation.ts`) so a rule can span any inputs (one field
// vs the CMD scope, or one field vs another), not just a single field.
interface BaseFieldConfig {
  key: string;
  label: string;
  options: LabeledOption[];
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
