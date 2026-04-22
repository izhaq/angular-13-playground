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

export type FieldType = 'single' | 'multi';

export type GridColGroup =
  | 'all8'       // L1-R4 (Primary board and Secondary first 8)
  | 'tll_tlr'    // TLL + TLR only
  | 'gdl'        // GDL only
  | 'none';      // excluded from grid (e.g. "Cmd to GS" fields)

export interface FieldConfig {
  key: string;
  label: string;
  type: FieldType;
  options: DropdownOption[];
  defaultValue: string | string[];
  gridColGroup: GridColGroup;
}
