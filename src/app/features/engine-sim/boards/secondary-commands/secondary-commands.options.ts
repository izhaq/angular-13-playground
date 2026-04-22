import { DropdownOption } from '../../../../components/app-dropdown/app-dropdown.models';
import { ENGINE_SIM_LABELS as L } from '../../shared/engine-sim.labels';
import {
  ANT_SELECT_CMD,
  INT_EXT,
  NORMAL_FORCED,
  ON_OFF,
  YES_NO,
} from '../../shared/option-values';

/**
 * Option sets used by Secondary Commands fields only.
 * `value` is sourced from canonical maps in shared/option-values.ts.
 * `abbr` is board-local (the same value renders differently per board).
 */

export const YES_NO_OPTIONS: DropdownOption[] = [
  { value: YES_NO.No,  label: L.no,  abbr: 'NO' },
  { value: YES_NO.Yes, label: L.yes, abbr: 'YES' },
];

export const INTERNAL_EXTERNAL_OPTIONS: DropdownOption[] = [
  { value: INT_EXT.Internal, label: L.internal, abbr: 'Int' },
  { value: INT_EXT.External, label: L.external, abbr: 'EXT' },
];

export const NORMAL_FORCED_OPTIONS: DropdownOption[] = [
  { value: NORMAL_FORCED.Normal, label: L.normal, abbr: 'NRML' },
  { value: NORMAL_FORCED.Forced, label: L.forced, abbr: 'FRC' },
];

export const MASTER_FAIL_OPTIONS: DropdownOption[] = [
  { value: ON_OFF.On,  label: L.on,  abbr: '—' },
  { value: ON_OFF.Off, label: L.off, abbr: '—' },
];

export const ANT_SELECT_CMD_OPTIONS: DropdownOption[] = [
  { value: ANT_SELECT_CMD.Auto,   label: L.antSelectCmdAuto,   abbr: 'ATU' },
  { value: ANT_SELECT_CMD.Manual, label: L.antSelectCmdManual, abbr: 'MNL' },
];
