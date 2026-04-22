import { ENGINE_SIM_LABELS as L } from '../../shared/engine-sim.labels';
import { FieldConfig } from '../../shared/engine-sim.models';
import { buildDefaultValues } from '../../shared/build-defaults.util';
import {
  ANT_SELECT_CMD,
  INT_EXT,
  NORMAL_FORCED,
  ON_OFF,
  YES_NO,
} from '../../shared/option-values';
import {
  ANT_SELECT_CMD_OPTIONS,
  INTERNAL_EXTERNAL_OPTIONS,
  MASTER_FAIL_OPTIONS,
  NORMAL_FORCED_OPTIONS,
  YES_NO_OPTIONS,
} from './secondary-commands.options';

/** Drives the first 8 grid columns (L1-L4 + R1-R4). */
export const SECONDARY_COMMANDS_8COL_FIELDS: FieldConfig[] = [
  { key: 'criticalFail',    label: L.criticalFail,    type: 'single', options: YES_NO_OPTIONS,            defaultValue: YES_NO.No,        gridColGroup: 'all8' },
  { key: 'tmpWarningFail',  label: L.tmpWarningFail,  type: 'single', options: INTERNAL_EXTERNAL_OPTIONS, defaultValue: INT_EXT.Internal, gridColGroup: 'all8' },
  { key: 'tmpFatalFail',    label: L.tmpFatalFail,    type: 'single', options: YES_NO_OPTIONS,            defaultValue: YES_NO.No,        gridColGroup: 'all8' },
  { key: 'tggCriticalFail', label: L.tggCriticalFail, type: 'single', options: YES_NO_OPTIONS,            defaultValue: YES_NO.No,        gridColGroup: 'all8' },
  { key: 'masterFail',      label: L.masterFail,      type: 'single', options: MASTER_FAIL_OPTIONS,       defaultValue: ON_OFF.On,        gridColGroup: 'all8' },
  { key: 'mslsFail',        label: L.mslsFail,        type: 'single', options: NORMAL_FORCED_OPTIONS,     defaultValue: NORMAL_FORCED.Normal, gridColGroup: 'all8' },
  { key: 'tempFail',        label: L.tempFail,        type: 'single', options: YES_NO_OPTIONS,            defaultValue: YES_NO.No,        gridColGroup: 'all8' },
];

/** Drives the TLL + TLR columns only. */
export const SECONDARY_COMMANDS_TLL_TLR_FIELDS: FieldConfig[] = [
  { key: 'commFail',     label: L.commFail,     type: 'single', options: YES_NO_OPTIONS,         defaultValue: YES_NO.No,            gridColGroup: 'tll_tlr' },
  { key: 'truFail',      label: L.truFail,      type: 'single', options: NORMAL_FORCED_OPTIONS,  defaultValue: NORMAL_FORCED.Normal, gridColGroup: 'tll_tlr' },
  { key: 'truTempFail',  label: L.truTempFail,  type: 'single', options: NORMAL_FORCED_OPTIONS,  defaultValue: NORMAL_FORCED.Normal, gridColGroup: 'tll_tlr' },
  { key: 'antSelectCmd', label: L.antSelectCmd, type: 'single', options: ANT_SELECT_CMD_OPTIONS, defaultValue: ANT_SELECT_CMD.Auto,  gridColGroup: 'tll_tlr' },
];

/** Drives the GDL column only. */
export const SECONDARY_COMMANDS_GDL_FIELDS: FieldConfig[] = [
  { key: 'antTransmitPwr',   label: L.antTransmitPwr,   type: 'single', options: NORMAL_FORCED_OPTIONS, defaultValue: NORMAL_FORCED.Normal, gridColGroup: 'gdl' },
  { key: 'superTransmitPwr', label: L.superTransmitPwr, type: 'single', options: NORMAL_FORCED_OPTIONS, defaultValue: NORMAL_FORCED.Normal, gridColGroup: 'gdl' },
  { key: 'tmpAntSelect',     label: L.tmpAntSelect,     type: 'single', options: NORMAL_FORCED_OPTIONS, defaultValue: NORMAL_FORCED.Normal, gridColGroup: 'gdl' },
];

export const SECONDARY_COMMANDS_ALL_FIELDS: FieldConfig[] = [
  ...SECONDARY_COMMANDS_8COL_FIELDS,
  ...SECONDARY_COMMANDS_TLL_TLR_FIELDS,
  ...SECONDARY_COMMANDS_GDL_FIELDS,
];

/** Returns a fresh defaults map; callers may mutate freely. */
export function buildSecondaryCommandsDefaults(): Record<string, string | string[]> {
  return buildDefaultValues(SECONDARY_COMMANDS_ALL_FIELDS);
}
