import { ENGINE_SIM_LABELS as L } from '../../shared/labels';
import { FieldConfig } from '../../shared/models';
import { buildDefaultValues } from '../build-defaults';
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
 * 8-column fields — values come from `mCommands[col].additionalFields`
 * per side. Wire interface: `SecondaryAdditionalFields`.
 */
export const SECONDARY_COMMANDS_8COL_FIELDS: FieldConfig[] = [
  { key: 'whlCriticalFail', label: L.whlCriticalFail, type: 'single', options: YES_NO_OPTIONS,        defaultValue: YES_NO.No },
  { key: 'whlWarningFail',  label: L.whlWarningFail,  type: 'single', options: NORMAL_FORCED_OPTIONS, defaultValue: NORMAL_FORCED.Normal },
  { key: 'whlFatalFail',    label: L.whlFatalFail,    type: 'single', options: YES_NO_OPTIONS,        defaultValue: YES_NO.No },
];

/**
 * TLL + TLR fields — values come from `aCommands` per entity.
 * Left entity → TLL column. Right entity → TLR column.
 */
export const SECONDARY_COMMANDS_TLL_TLR_FIELDS: FieldConfig[] = [
  { key: 'tlCriticalFail', label: L.tlCriticalFail, type: 'single', options: YES_NO_OPTIONS,        defaultValue: YES_NO.No },
  { key: 'masterTlFail',   label: L.masterTlFail,   type: 'single', options: ON_OFF_OPTIONS,        defaultValue: ON_OFF.On },
  { key: 'msTlFail',       label: L.msTlFail,       type: 'single', options: NORMAL_FORCED_OPTIONS, defaultValue: NORMAL_FORCED.Normal },
  { key: 'tlTempFail',     label: L.tlTempFail,     type: 'single', options: YES_NO_OPTIONS,        defaultValue: YES_NO.No },
  { key: 'tlToAgCommFail', label: L.tlToAgCommFail, type: 'single', options: YES_NO_OPTIONS,        defaultValue: YES_NO.No },
];

/**
 * GDL fields — values are flat on `EntityData` (no wrapper). Side-independent;
 * backend duplicates across entities, the grid reads from `entities[0]` only.
 */
export const SECONDARY_COMMANDS_GDL_FIELDS: FieldConfig[] = [
  { key: 'gdlFail',        label: L.gdlFail,        type: 'single', options: NORMAL_FORCED_OPTIONS, defaultValue: NORMAL_FORCED.Normal },
  { key: 'gdlTempFail',    label: L.gdlTempFail,    type: 'single', options: NORMAL_FORCED_OPTIONS, defaultValue: NORMAL_FORCED.Normal },
  { key: 'antTransmitPwr', label: L.antTransmitPwr, type: 'single', options: AUTO_MANUAL_OPTIONS,   defaultValue: AUTO_MANUAL.Auto },
  { key: 'antSelectedCmd', label: L.antSelectedCmd, type: 'single', options: NORMAL_FORCED_OPTIONS, defaultValue: NORMAL_FORCED.Normal },
  { key: 'gdlTransmitPwr', label: L.gdlTransmitPwr, type: 'single', options: NORMAL_FORCED_OPTIONS, defaultValue: NORMAL_FORCED.Normal },
  { key: 'uuuAntSelect',   label: L.uuuAntSelect,   type: 'single', options: NORMAL_FORCED_OPTIONS, defaultValue: NORMAL_FORCED.Normal },
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
