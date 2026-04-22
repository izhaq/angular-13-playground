import { DropdownOption } from '../../../components/app-dropdown/app-dropdown.models';
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
  id: string;
  label: string;
}

export interface GridRow {
  fieldKey: string;
  label: string;
  values: Record<string, string>;
}

// ---------------------------------------------------------------------------
// Field Configuration (drives form rendering + grid row ordering)
// ---------------------------------------------------------------------------

export type GridColGroup =
  | 'all8'       // L1-R4 (Primary board and Secondary first 8)
  | 'tll_tlr'    // TLL + TLR only
  | 'gdl'        // GDL only
  | 'none';      // excluded from grid (e.g. "Cmd to GS" fields)

/**
 * A dropdown option that is also rendered in the status grid.
 * Extends the generic DropdownOption by making `abbr` required — the grid
 * uses `abbr` as the cell text, so a missing abbr would render blank.
 */
export type LabeledOption = DropdownOption & { abbr: string };

interface BaseFieldConfig {
  key: string;
  label: string;
  options: LabeledOption[];
  gridColGroup: GridColGroup;
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
