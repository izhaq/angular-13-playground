"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processRareConfig = exports.processConfig = void 0;
const SIDE_PREFIX = { left: 'L', right: 'R' };
const ABBR_MAPS = {
    ttm: { 'not-active': 'N/A', 'real': 'REA', 'captive': 'CAP' },
    weather: { 'no': 'NO', 'yes': 'YES' },
    videoRec: { 'internal': 'INT', 'external': 'EXT' },
    videoType: { 'no': 'NO', 'hd': 'HD', '4k': '4K', '8k': '8K' },
    headlights: { 'no': 'NO', 'yes': 'YES' },
    pwrOnOff: { 'on': 'ON', 'off': 'OFF' },
    force: { 'normal': 'NRM', 'force-f': 'FRC', 'force-no': 'FNO' },
    stability: { 'no': 'NO', 'yes': 'YES' },
    cruiseCtrl: { 'no': 'NO', 'yes': 'YES' },
    plr: { 'no': 'NO', 'yes': 'YES' },
    aux: { 'no': 'NO', 'yes': 'YES' },
};
const YES_NO_ABBR = { 'no': 'NO', 'yes': 'YES' };
const CMD_TEST_ABBR_MAPS = {
    nta: YES_NO_ABBR,
    tisMtrRec: YES_NO_ABBR,
    rideMtrRec: YES_NO_ABBR,
};
const NORMAL_FORCE_IGNORE_ABBR = { 'normal': 'NRM', 'force': 'FRC', 'ignore': 'IGN' };
const RARE_ABBR_MAPS = {
    absCriticalFail: NORMAL_FORCE_IGNORE_ABBR,
    absWarningFail: NORMAL_FORCE_IGNORE_ABBR,
    absFatalFail: NORMAL_FORCE_IGNORE_ABBR,
    brakeCriticalFail: NORMAL_FORCE_IGNORE_ABBR,
    masterResetFail: NORMAL_FORCE_IGNORE_ABBR,
    flashCriticalFail: NORMAL_FORCE_IGNORE_ABBR,
    busTempFail: NORMAL_FORCE_IGNORE_ABBR,
    tireCommFail: YES_NO_ABBR,
    fuelMapTempFail: NORMAL_FORCE_IGNORE_ABBR,
    coolantCriticalFail: NORMAL_FORCE_IGNORE_ABBR,
};
const OPERATIONS_KEYS = [
    'ttm', 'weather', 'videoRec', 'videoType',
    'headlights', 'pwrOnOff', 'force', 'stability',
    'cruiseCtrl', 'plr', 'aux',
];
const CMD_TEST_KEYS = [
    'nta', 'tisMtrRec', 'rideMtrRec',
];
const RARE_OPERATIONS_KEYS = [
    'absCriticalFail', 'absWarningFail', 'absFatalFail', 'brakeCriticalFail',
    'masterResetFail', 'flashCriticalFail', 'busTempFail', 'tireCommFail',
    'fuelMapTempFail', 'coolantCriticalFail',
];
const TTL_TTR_FIELDS = new Set([
    'absFatalFail', 'brakeCriticalFail', 'busTempFail', 'tireCommFail',
]);
const SSL_FIELDS = new Set([
    'fuelMapTempFail', 'coolantCriticalFail',
]);
function computeColumnIds(sides, wheels) {
    const columns = [];
    for (const side of sides) {
        const prefix = SIDE_PREFIX[side] || side.charAt(0).toUpperCase();
        for (const wheel of wheels) {
            columns.push(`${prefix}${wheel}`);
        }
    }
    return columns;
}
function formatValue(val) {
    return Array.isArray(val) ? val.join(',') : val;
}
function resolveAbbr(rawValue, abbrMap) {
    var _a;
    if (!abbrMap) {
        return rawValue;
    }
    if (rawValue.includes(',')) {
        return rawValue
            .split(',')
            .map(part => part.trim())
            .filter(Boolean)
            .map(part => { var _a; return (_a = abbrMap[part]) !== null && _a !== void 0 ? _a : part; })
            .join(',');
    }
    return (_a = abbrMap[rawValue]) !== null && _a !== void 0 ? _a : rawValue;
}
function buildCellValue(rawValue, abbrMap) {
    return {
        value: rawValue,
        abbr: resolveAbbr(rawValue, abbrMap),
    };
}
const DEFAULT_CMD_TEST = {
    nta: 'no',
    tisMtrRec: 'no',
    rideMtrRec: 'no',
};
function processConfig(state) {
    const columns = computeColumnIds(state.cmd.sides, state.cmd.wheels);
    const ops = state.operations;
    const cmdTest = state.cmdTest || DEFAULT_CMD_TEST;
    const operationUpdates = OPERATIONS_KEYS.map((key) => {
        const rawValue = formatValue(ops[key]);
        const abbrMap = ABBR_MAPS[key];
        const cells = {};
        for (const col of columns) {
            cells[col] = buildCellValue(rawValue, abbrMap);
        }
        return { field: key, cells };
    });
    const cmdTestUpdates = CMD_TEST_KEYS.map((key) => {
        const rawValue = cmdTest[key];
        const abbrMap = CMD_TEST_ABBR_MAPS[key];
        const cells = {};
        for (const col of columns) {
            cells[col] = buildCellValue(rawValue, abbrMap);
        }
        return { field: key, cells };
    });
    return [...operationUpdates, ...cmdTestUpdates];
}
exports.processConfig = processConfig;
function processRareConfig(state) {
    const columns = computeColumnIds(state.cmd.sides, state.cmd.wheels);
    const sides = state.cmd.sides;
    const ops = state.rareOperations;
    return RARE_OPERATIONS_KEYS.map((key) => {
        const rawValue = ops[key];
        const abbrMap = RARE_ABBR_MAPS[key];
        const cells = {};
        for (const col of columns) {
            cells[col] = buildCellValue(rawValue, abbrMap);
        }
        if (TTL_TTR_FIELDS.has(key)) {
            if (sides.includes('left')) {
                cells['TTL'] = buildCellValue(rawValue, abbrMap);
            }
            if (sides.includes('right')) {
                cells['TTR'] = buildCellValue(rawValue, abbrMap);
            }
        }
        if (SSL_FIELDS.has(key)) {
            cells['SSL'] = buildCellValue(rawValue, abbrMap);
        }
        return { field: key, cells };
    });
}
exports.processRareConfig = processRareConfig;
