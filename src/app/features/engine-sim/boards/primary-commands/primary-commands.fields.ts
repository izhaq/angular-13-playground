import { ENGINE_SIM_LABELS as L } from '../../shared/labels';
import { FieldConfig } from '../../shared/models';
import { buildDefaultValues } from '../build-defaults';
import {
  INT_EXT,
  NORMAL_FORCED,
  ON_OFF,
  TFF,
  VIDEO_REC_TYPE,
  YES_NO,
} from '../../shared/option-values';
import {
  FORCE_TTL_OPTIONS,
  ON_OFF_OPTIONS,
  TFF_OPTIONS,
  VIDEO_REC_OPTIONS,
  VIDEO_REC_TYPE_OPTIONS,
  YES_NO_OPTIONS,
} from './primary-commands.options';

/** Main scrollable column of Primary Commands. Drives the 8-column grid. */
export const PRIMARY_COMMANDS_MAIN_FIELDS: FieldConfig[] = [
  { key: 'tff',           label: L.tff,           type: 'single', options: TFF_OPTIONS,            defaultValue: TFF.NotActive },
  { key: 'mlmTransmit',   label: L.mlmTransmit,   type: 'single', options: YES_NO_OPTIONS,         defaultValue: YES_NO.No },
  { key: 'videoRec',      label: L.videoRec,      type: 'single', options: VIDEO_REC_OPTIONS,      defaultValue: INT_EXT.Internal },
  { key: 'videoRecType',  label: L.videoRecType,  type: 'multi',  options: VIDEO_REC_TYPE_OPTIONS, defaultValue: [VIDEO_REC_TYPE.No] },
  { key: 'mtrRec',        label: L.mtrRec,        type: 'single', options: YES_NO_OPTIONS,         defaultValue: YES_NO.No },
  { key: 'speedPwrOnOff', label: L.speedPwrOnOff, type: 'single', options: ON_OFF_OPTIONS,         defaultValue: ON_OFF.On },
  { key: 'forceTtl',      label: L.forceTtl,      type: 'single', options: FORCE_TTL_OPTIONS,      defaultValue: NORMAL_FORCED.Normal },
  { key: 'nuu',           label: L.nuu,           type: 'single', options: YES_NO_OPTIONS,         defaultValue: YES_NO.No },
  { key: 'muDump',        label: L.muDump,        type: 'single', options: YES_NO_OPTIONS,         defaultValue: YES_NO.No },
  { key: 'sendMtrTss',    label: L.sendMtrTss,    type: 'single', options: YES_NO_OPTIONS,         defaultValue: YES_NO.No },
  { key: 'abort',         label: L.abort,         type: 'single', options: YES_NO_OPTIONS,         defaultValue: YES_NO.No },
];

/**
 * "Cmd to GS" sub-section — submitted with the form but excluded from the grid.
 * Kept in its own array so the grid row builder is never asked about them.
 */
export const PRIMARY_COMMANDS_CMD_TO_GS_FIELDS: FieldConfig[] = [
  { key: 'teo',      label: L.teo,      type: 'single', options: YES_NO_OPTIONS, defaultValue: YES_NO.No },
  { key: 'gsMtrRec', label: L.gsMtrRec, type: 'single', options: YES_NO_OPTIONS, defaultValue: YES_NO.No },
  { key: 'aiMtrRec', label: L.aiMtrRec, type: 'single', options: YES_NO_OPTIONS, defaultValue: YES_NO.No },
];

export const PRIMARY_COMMANDS_ALL_FIELDS: FieldConfig[] = [
  ...PRIMARY_COMMANDS_MAIN_FIELDS,
  ...PRIMARY_COMMANDS_CMD_TO_GS_FIELDS,
];

/** Returns a fresh defaults map; callers may mutate freely. */
export function buildPrimaryCommandsDefaults(): Record<string, string | string[]> {
  return buildDefaultValues(PRIMARY_COMMANDS_ALL_FIELDS);
}
