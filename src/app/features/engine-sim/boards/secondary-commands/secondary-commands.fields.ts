import { ENGINE_SIM_LABELS as L } from '../../shared/engine-sim.labels';
import { FieldConfig } from '../../shared/engine-sim.models';
import { buildDefaultValues } from '../../shared/build-defaults.util';
import {
  AUTO_MANUAL,
  NORMAL_FORCED,
  ON_OFF,
  YES_NO,
} from '../../shared/option-values';
import {
  AUTO_MANUAL_OPTIONS,
  NORMAL_FORCED_OPTIONS,
  ON_OFF_OPTIONS,
  YES_NO_OPTIONS,
} from './secondary-commands.options';

/**
 * 8-column fields — populate L1-R4 via `mCommands[col].additionalFields`.
 * Wire interface: `SecondaryAdditionalFields` (named props, one per field key).
 */
export const SECONDARY_COMMANDS_8COL_FIELDS: FieldConfig[] = [
  { key: 'whlCriticalFail', label: L.whlCriticalFail, type: 'single', options: YES_NO_OPTIONS,         defaultValue: YES_NO.No,            gridColGroup: 'all8' },
  { key: 'whlWarningFail',  label: L.whlWarningFail,  type: 'single', options: NORMAL_FORCED_OPTIONS,  defaultValue: NORMAL_FORCED.Normal, gridColGroup: 'all8' },
  { key: 'whlFatalFail',    label: L.whlFatalFail,    type: 'single', options: YES_NO_OPTIONS,         defaultValue: YES_NO.No,            gridColGroup: 'all8' },
];

/**
 * TLL + TLR fields — populate the TLL (left entity) and TLR (right entity)
 * columns from `aCommands` per entity. Wire interface: `ACommandsData`.
 */
export const SECONDARY_COMMANDS_TLL_TLR_FIELDS: FieldConfig[] = [
  { key: 'tlCriticalFail', label: L.tlCriticalFail, type: 'single', options: YES_NO_OPTIONS,        defaultValue: YES_NO.No,            gridColGroup: 'tll_tlr' },
  { key: 'masterTlFail',   label: L.masterTlFail,   type: 'single', options: ON_OFF_OPTIONS,        defaultValue: ON_OFF.On,            gridColGroup: 'tll_tlr' },
  { key: 'msTlFail',       label: L.msTlFail,       type: 'single', options: NORMAL_FORCED_OPTIONS, defaultValue: NORMAL_FORCED.Normal, gridColGroup: 'tll_tlr' },
  { key: 'tlTempFail',     label: L.tlTempFail,     type: 'single', options: YES_NO_OPTIONS,        defaultValue: YES_NO.No,            gridColGroup: 'tll_tlr' },
  { key: 'tlToAgCommFail', label: L.tlToAgCommFail, type: 'single', options: YES_NO_OPTIONS,        defaultValue: YES_NO.No,            gridColGroup: 'tll_tlr' },
];

/**
 * GDL fields — populate the single GDL column. The 6 props below sit
 * **flat on `EntityData`** (no wrapper on the wire). Side-independent —
 * backend duplicates them across both entities; the grid reads from
 * `entities[0]` only. Field-key union: `GdlFieldKey`.
 */
export const SECONDARY_COMMANDS_GDL_FIELDS: FieldConfig[] = [
  { key: 'gdlFail',        label: L.gdlFail,        type: 'single', options: NORMAL_FORCED_OPTIONS, defaultValue: NORMAL_FORCED.Normal, gridColGroup: 'gdl' },
  { key: 'gdlTempFail',    label: L.gdlTempFail,    type: 'single', options: NORMAL_FORCED_OPTIONS, defaultValue: NORMAL_FORCED.Normal, gridColGroup: 'gdl' },
  { key: 'antTransmitPwr', label: L.antTransmitPwr, type: 'single', options: AUTO_MANUAL_OPTIONS,   defaultValue: AUTO_MANUAL.Auto,     gridColGroup: 'gdl' },
  { key: 'antSelectedCmd', label: L.antSelectedCmd, type: 'single', options: NORMAL_FORCED_OPTIONS, defaultValue: NORMAL_FORCED.Normal, gridColGroup: 'gdl' },
  { key: 'gdlTransmitPwr', label: L.gdlTransmitPwr, type: 'single', options: NORMAL_FORCED_OPTIONS, defaultValue: NORMAL_FORCED.Normal, gridColGroup: 'gdl' },
  { key: 'uuuAntSelect',   label: L.uuuAntSelect,   type: 'single', options: NORMAL_FORCED_OPTIONS, defaultValue: NORMAL_FORCED.Normal, gridColGroup: 'gdl' },
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
