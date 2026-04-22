/**
 * Centralized translation-style label map for the Engine Sim feature.
 *
 * Treat this file the same way you would a locale JSON file in an i18n setup:
 * one flat key→value map, one source of truth for all user-facing copy.
 * On migration, these keys can be lifted directly into the host project's
 * translation system (ngx-translate, Transloco, Angular i18n, ...).
 *
 * Notes:
 * - Display abbreviations for grid cells live on `DropdownOption.abbr`,
 *   not here. They are not "user-facing copy" in the i18n sense.
 * - Prefer using the field key as the label key when possible
 *   (e.g. field key `tff` → `L.tff`) to avoid divergence.
 */
export const ENGINE_SIM_LABELS = {

  // -- Wrapper / Shell -------------------------------------------------------
  testMode: 'Test Mode',
  tabPrimaryCommands: 'System Commands',
  tabSecondaryCommands: 'Failure & Antenna',

  // -- CMD Section -----------------------------------------------------------
  cmd: 'Cmd.',
  cmdSide: 'Selected Side',
  cmdWheel: 'Selected Wheel',
  sideLeft: 'Left',
  sideRight: 'Right',

  // -- Footer Buttons --------------------------------------------------------
  defaults: 'Defaults',
  cancel: 'Cancel',
  apply: 'Apply',

  // -- Board 1: System Commands — Main Fields --------------------------------
  tff: 'TFF',
  tffNotActive: 'Not Active',
  tffLightActive: 'Light Active',
  tffDominate: 'Dominate',

  mlmTransmit: 'MLM transmit',

  videoRec: 'Video rec',
  videoRecInternal: 'Internal',
  videoRecExternal: 'External',

  videoRecType: 'Video Rec Type',
  videoRecTypeNo: 'No',
  videoRecTypeIr: 'Infra Red',
  videoRecType4k: '4K',
  videoRecTypeHdr: 'HDR',

  mtrRec: 'Mtr Rec',

  speedPwrOnOff: 'Speed PWR On/Off',

  forceTtl: 'Force TTL',
  forceTtlNormal: 'Normal',
  forceTtlForced: 'FORCED',

  nuu: 'NUU',

  muDump: 'MU dump',

  sendMtrTss: 'Send Mtr TSS',

  abort: 'Abort',

  // -- Board 1: "Cmd to GS" Sub-Section -------------------------------------
  cmdToGs: 'Cmd to GS',
  teo: 'Teo',
  gsMtrRec: 'Mtr Rec',
  aiMtrRec: 'Ai Mtr Rec',

  // -- Board 2: Failure & Antenna — First 8 Columns -------------------------
  criticalFail: 'Critical Fail',
  tmpWarningFail: 'Tmp Warning Fail',
  tmpFatalFail: 'Tmp Fatal Fail',
  tggCriticalFail: 'TGG Critical Fail',

  masterFail: 'Master Fail',

  mslsFail: 'MSLs Fail',

  tempFail: 'Temp Fail',

  // -- Board 2: Failure & Antenna — Last 3 Columns --------------------------
  commFail: 'Comm Fail',

  truFail: 'TRU Fail',
  truTempFail: 'TRU Temp Fail',

  antSelectCmd: 'Ant Select Cmd',
  antSelectCmdAuto: 'Auto',
  antSelectCmdManual: 'Manual',

  antTransmitPwr: 'Ant Transmit Pwr',
  superTransmitPwr: 'Super Transmit Pwr',
  tmpAntSelect: 'Tmp Ant Select',

  // -- Shared Option Labels --------------------------------------------------
  no: 'No',
  yes: 'Yes',
  on: 'On',
  off: 'Off',
  normal: 'Normal',
  forced: 'FORCED',
  internal: 'Internal',
  external: 'External',

  // -- Grid Column Headers ---------------------------------------------------
  colL1: 'L1',
  colL2: 'L2',
  colL3: 'L3',
  colL4: 'L4',
  colR1: 'R1',
  colR2: 'R2',
  colR3: 'R3',
  colR4: 'R4',
  colTll: 'TLL',
  colTlr: 'TLR',
  colGdl: 'GDL',

} as const;

export type LabelKey = keyof typeof ENGINE_SIM_LABELS;
