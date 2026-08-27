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

/**
 * Cell style tokens. A field maps one of its option values to a token via
 * `FieldConfig.cellStyles`; the grid then renders that cell with
 * `board-rows__data-cell--{token}`. Every token MUST have a matching
 * modifier in `board-rows.component.scss`, or the style silently no-ops.
 */
export const CELL_STYLES = { Alert: 'alert' } as const;
export type CellStyle = typeof CELL_STYLES[keyof typeof CELL_STYLES];

export interface GridRow {
  fieldKey: string;
  label: string;
  /** Display text per column id — the option's `abbr`, NOT the wire value. */
  values: Record<string, string>;
  /**
   * Style token per column id, for cells whose value asks for one (see
   * `FieldConfig.cellStyles`). Sparse — only styled columns appear — and
   * absent entirely on hand-built rows that opt out.
   */
  styles?: Record<string, CellStyle>;
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
  /**
   * Value-driven cell styling: option value → style token. Keyed by the
   * canonical WIRE value (`'yes'`), never the display `abbr` (`'Yes'`) —
   * the two coincide for yes/no but diverge elsewhere (TFF `'not_active'`
   * renders as `'NACV'`). Multi-select cells match when the array contains
   * the key. Fields kept out of the grid never render a cell, so a style
   * declared on one is simply never shown.
   */
  cellStyles?: Record<string, CellStyle>;
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
