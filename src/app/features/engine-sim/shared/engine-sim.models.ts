import { DropdownOption } from '../../../components/app-dropdown/app-dropdown.models';
import { GridColId } from './column-ids';
import { Side, Wheel } from './option-values';

/**
 * Internal view models and configuration shapes — what we own.
 *
 * Anything that flows over the network lives in `engine-sim.api-contract.ts`.
 * This file is for types that exist only inside the feature.
 */

// ---------------------------------------------------------------------------
// CMD Selection (shared across tabs, lives in shell component state)
// ---------------------------------------------------------------------------

export interface CmdSelection {
  sides: Side[];
  wheels: Wheel[];
}

// ---------------------------------------------------------------------------
// Grid View Models
// ---------------------------------------------------------------------------

export interface GridColumn {
  id: GridColId;
  label: string;
}

export interface GridRow {
  fieldKey: string;
  label: string;
  values: Record<string, string>;
}

// ---------------------------------------------------------------------------
// Field Configuration (drives form rendering)
// ---------------------------------------------------------------------------

/**
 * A dropdown option that is also rendered in the status grid.
 * Extends the generic DropdownOption by making `abbr` required — the grid
 * uses `abbr` as the cell text, so a missing abbr would render blank.
 */
export type LabeledOption = DropdownOption & { abbr: string };

/**
 * No "this field belongs in the grid" flag here on purpose. Form-only fields
 * (e.g. Primary's "Cmd to GS" sub-section) are kept in their own array and
 * just not passed to the grid row builder. The form renders ALL_FIELDS, the
 * grid renders the subset that actually has wire data behind it.
 */
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

/**
 * Discriminated union: narrowing on `type` enforces `defaultValue` shape
 * at compile time (single → string, multi → string[]).
 */
export type FieldConfig = SingleSelectField | MultiSelectField;
export type FieldType = FieldConfig['type'];
