import { ENGINE_SIM_LABELS as L } from '../../shared/engine-sim.labels';
import { FieldConfig } from '../../shared/engine-sim.models';
import { buildDefaultValues } from '../../shared/build-defaults.util';
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
  { key: 'tff',           label: L.tff,           type: 'single', options: TFF_OPTIONS,            defaultValue: TFF.NotActive,    gridColGroup: 'all8' },
  { key: 'mlmTransmit',   label: L.mlmTransmit,   type: 'single', options: YES_NO_OPTIONS,         defaultValue: YES_NO.No,        gridColGroup: 'all8' },
  { key: 'videoRec',      label: L.videoRec,      type: 'single', options: VIDEO_REC_OPTIONS,      defaultValue: INT_EXT.Internal, gridColGroup: 'all8' },
  { key: 'videoRecType',  label: L.videoRecType,  type: 'multi',  options: VIDEO_REC_TYPE_OPTIONS, defaultValue: [VIDEO_REC_TYPE.No], gridColGroup: 'all8' },
  { key: 'mtrRec',        label: L.mtrRec,        type: 'single', options: YES_NO_OPTIONS,         defaultValue: YES_NO.No,        gridColGroup: 'all8' },
  { key: 'speedPwrOnOff', label: L.speedPwrOnOff, type: 'single', options: ON_OFF_OPTIONS,         defaultValue: ON_OFF.On,        gridColGroup: 'all8' },
  { key: 'forceTtl',      label: L.forceTtl,      type: 'single', options: FORCE_TTL_OPTIONS,      defaultValue: NORMAL_FORCED.Normal, gridColGroup: 'all8' },
  { key: 'nuu',           label: L.nuu,           type: 'single', options: YES_NO_OPTIONS,         defaultValue: YES_NO.No,        gridColGroup: 'all8' },
  { key: 'muDump',        label: L.muDump,        type: 'single', options: YES_NO_OPTIONS,         defaultValue: YES_NO.No,        gridColGroup: 'all8' },
  { key: 'sendMtrTss',    label: L.sendMtrTss,    type: 'single', options: YES_NO_OPTIONS,         defaultValue: YES_NO.No,        gridColGroup: 'all8' },
  { key: 'abort',         label: L.abort,         type: 'single', options: YES_NO_OPTIONS,         defaultValue: YES_NO.No,        gridColGroup: 'all8' },
];

/** "Cmd to GS" sub-section. Submitted with the form but excluded from the grid. */
export const PRIMARY_COMMANDS_CMD_TO_GS_FIELDS: FieldConfig[] = [
  { key: 'teo',      label: L.teo,      type: 'single', options: YES_NO_OPTIONS, defaultValue: YES_NO.No, gridColGroup: 'none' },
  { key: 'gsMtrRec', label: L.gsMtrRec, type: 'single', options: YES_NO_OPTIONS, defaultValue: YES_NO.No, gridColGroup: 'none' },
  { key: 'aiMtrRec', label: L.aiMtrRec, type: 'single', options: YES_NO_OPTIONS, defaultValue: YES_NO.No, gridColGroup: 'none' },
];

export const PRIMARY_COMMANDS_ALL_FIELDS: FieldConfig[] = [
  ...PRIMARY_COMMANDS_MAIN_FIELDS,
  ...PRIMARY_COMMANDS_CMD_TO_GS_FIELDS,
];

/** Returns a fresh defaults map; callers may mutate freely. */
export function buildPrimaryCommandsDefaults(): Record<string, string | string[]> {
  return buildDefaultValues(PRIMARY_COMMANDS_ALL_FIELDS);
}
