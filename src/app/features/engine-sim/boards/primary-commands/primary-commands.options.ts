import { ENGINE_SIM_LABELS as L } from '../../shared/labels';
import { LabeledOption } from '../../shared/models';
import {
  INT_EXT,
  NORMAL_FORCED,
  ON_OFF,
  TFF,
  VIDEO_REC_TYPE,
  YES_NO,
} from '../../shared/option-values';

/**
 * Option sets used by Primary Commands fields only.
 * `value` is sourced from canonical maps in shared/option-values.ts.
 * `abbr` is board-local (the same value renders differently per board)
 * and required by `LabeledOption` so the grid cell is never blank.
 */

export const TFF_OPTIONS: LabeledOption[] = [
  { value: TFF.NotActive,   label: L.tffNotActive,   abbr: 'NACV' },
  { value: TFF.LightActive, label: L.tffLightActive, abbr: 'LACV' },
  { value: TFF.Dominate,    label: L.tffDominate,    abbr: 'DMN' },
];

export const VIDEO_REC_OPTIONS: LabeledOption[] = [
  { value: INT_EXT.Internal, label: L.videoRecInternal, abbr: 'Int' },
  { value: INT_EXT.External, label: L.videoRecExternal, abbr: 'EXT' },
];

export const VIDEO_REC_TYPE_OPTIONS: LabeledOption[] = [
  { value: VIDEO_REC_TYPE.No,       label: L.videoRecTypeNo,  abbr: 'No' },
  { value: VIDEO_REC_TYPE.InfraRed, label: L.videoRecTypeIr,  abbr: 'IRD' },
  { value: VIDEO_REC_TYPE.K4,       label: L.videoRecType4k,  abbr: '4k' },
  { value: VIDEO_REC_TYPE.Hdr,      label: L.videoRecTypeHdr, abbr: 'HDR' },
];

export const FORCE_TTL_OPTIONS: LabeledOption[] = [
  { value: NORMAL_FORCED.Normal, label: L.forceTtlNormal, abbr: 'N' },
  { value: NORMAL_FORCED.Forced, label: L.forceTtlForced, abbr: 'FRC' },
];

export const ON_OFF_OPTIONS: LabeledOption[] = [
  { value: ON_OFF.On,  label: L.on,  abbr: 'ON' },
  { value: ON_OFF.Off, label: L.off, abbr: 'OFF' },
];

export const YES_NO_OPTIONS: LabeledOption[] = [
  { value: YES_NO.No,  label: L.no,  abbr: 'No' },
  { value: YES_NO.Yes, label: L.yes, abbr: 'Yes' },
];
