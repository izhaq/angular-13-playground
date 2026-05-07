/**
 * i18n-style label map for the System Experiments feature. On migration
 * these keys can lift directly into the host project's translation system.
 * Grid-cell abbreviations live on `DropdownOption.abbr`, not here.
 */
export const SYSTEM_EXPERIMENTS_LABELS = {

  // -- Wrapper / Shell -------------------------------------------------------
  testMode: 'Sys Mode',
  testModeActive: 'Active',
  testModeNotActive: 'Not Active',
  tabPrimaryCommands: 'System Commands',
  tabSecondaryCommands: 'Failure & Antenna',

  // -- CMD Section -----------------------------------------------------------
  cmd: 'Cmd',
  sideLeft: 'Left',
  sideRight: 'Right',

  // -- Footer Buttons --------------------------------------------------------
  defaults: 'Defaults',
  cancel: 'Cancel',
  apply: 'Apply',

  // -- Primary: Main Fields --------------------------------------------------
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

  // -- Primary: "Cmd to GS" Sub-Section --------------------------------------
  cmdToGs: 'Cmd to GS',
  teo: 'Teo',
  gsMtrRec: 'Mtr Rec',
  aiMtrRec: 'Ai Mtr Rec',

  // -- Secondary: 8-Column Fields (additionalFields) -------------------------
  whlCriticalFail: 'Wheel Critical Fail',
  whlWarningFail:  'Wheel Warning Fail',
  whlFatalFail:    'Wheel Fatal Fail',

  // -- Secondary: TLL/TLR Fields (aCommands) ---------------------------------
  tlCriticalFail:  'TL Critical Fail',
  masterTlFail:    'Master TL Fail',
  msTlFail:        'MSs TL Fail',
  tlTempFail:      'TL Temp Fail',
  tlToAgCommFail:  'TL to AGM Comm Fail',

  // -- Secondary: GDL Fields (per-entity, side-independent) ------------------
  gdlFail:         'GDL Fail',
  gdlTempFail:     'GDL Temp Fail',
  antTransmitPwr:  'Ant Transmit Pwr',
  antSelectedCmd:  'Ant Selected Cmd',
  gdlTransmitPwr:  'GDL Transmit Pwr',
  uuuAntSelect:    'UUU Ant Select',

  // -- Secondary: Multi-location Fields --------------------------------------
  // Same key spans multiple wire structures; renders across the subset
  // of 11 columns the backend populates per frame.
  linkHealth:      'Link Health',

  // -- Shared Option Labels --------------------------------------------------
  no: 'No',
  yes: 'Yes',
  on: 'On',
  off: 'Off',
  normal: 'Normal',
  forced: 'FORCED',
  internal: 'Internal',
  external: 'External',
  auto: 'Auto',
  manual: 'Manual',

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

export type LabelKey = keyof typeof SYSTEM_EXPERIMENTS_LABELS;
