"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateTestModePayload = exports.validatePayload = exports.applySecondary = exports.applyPrimary = exports.resetState = exports.buildInitialState = void 0;
// Field categorization (matches the front-end's boards/*/fields.ts).
// Multi-location keys (e.g. `linkHealth`) appear in multiple sets — one
// POST writes the value to every matching slot via independent passes
// in `applySecondary`.
const PRIMARY_STANDARD_KEYS = [
    'tff', 'mlmTransmit', 'videoRec', 'videoRecType', 'mtrRec',
    'speedPwrOnOff', 'forceTtl', 'nuu', 'muDump', 'sendMtrTss', 'abort',
];
/** Form-only — ride along on the POST but never land in the wire response. */
const PRIMARY_CMD_TO_GS_KEYS = new Set([
    'teo', 'gsMtrRec', 'aiMtrRec',
]);
const SECONDARY_ADDITIONAL_KEYS = [
    'whlCriticalFail', 'whlWarningFail', 'whlFatalFail',
    'linkHealth',
];
const SECONDARY_ACOMMANDS_KEYS = [
    'tlCriticalFail', 'masterTlFail', 'msTlFail', 'tlTempFail', 'tlToAgCommFail',
    'linkHealth',
];
const SECONDARY_GDL_KEYS = [
    'gdlFail', 'gdlTempFail', 'antTransmitPwr',
    'antSelectedCmd', 'gdlTransmitPwr', 'uuuAntSelect',
    'linkHealth',
];
const PRIMARY_STANDARD_KEY_SET = new Set(PRIMARY_STANDARD_KEYS);
const SECONDARY_ADDITIONAL_KEY_SET = new Set(SECONDARY_ADDITIONAL_KEYS);
const SECONDARY_ACOMMANDS_KEY_SET = new Set(SECONDARY_ACOMMANDS_KEYS);
const SECONDARY_GDL_KEY_SET = new Set(SECONDARY_GDL_KEYS);
function emptyMCommand() {
    return {
        standardFields: {
            tff: 'not_active',
            mlmTransmit: 'no',
            videoRec: 'internal',
            videoRecType: ['no'],
            mtrRec: 'no',
            speedPwrOnOff: 'on',
            forceTtl: 'normal',
            nuu: 'no',
            muDump: 'no',
            sendMtrTss: 'no',
            abort: 'no',
        },
        additionalFields: {
            whlCriticalFail: 'no',
            whlWarningFail: 'normal',
            whlFatalFail: 'no',
            // Multi-location seed — same key in all three structures so the field
            // renders across all 11 secondary columns from boot.
            linkHealth: 'normal',
        },
    };
}
function emptyACommands() {
    return {
        tlCriticalFail: 'no',
        masterTlFail: 'on',
        msTlFail: 'normal',
        tlTempFail: 'no',
        tlToAgCommFail: 'no',
        linkHealth: 'normal',
    };
}
function emptyEntity(entityId) {
    return {
        entityId,
        mCommands: [emptyMCommand(), emptyMCommand(), emptyMCommand(), emptyMCommand()],
        aCommands: emptyACommands(),
        gdlFail: 'normal',
        gdlTempFail: 'normal',
        antTransmitPwr: 'auto',
        antSelectedCmd: 'normal',
        gdlTransmitPwr: 'normal',
        uuuAntSelect: 'normal',
        linkHealth: 'normal',
    };
}
function buildInitialState() {
    return {
        entities: [emptyEntity('left'), emptyEntity('right')],
    };
}
exports.buildInitialState = buildInitialState;
/**
 * Wipes the live state back to bootstrap defaults in place. Mutates so
 * the WS broadcast sees the same object reference everyone else holds.
 */
function resetState(state) {
    const fresh = buildInitialState();
    state.entities = fresh.entities;
}
exports.resetState = resetState;
function entityIdxFor(side) {
    return side === 'left' ? 0 : 1;
}
function cmdIdxFor(wheel) {
    return (Number(wheel) - 1);
}
/**
 * Primary apply: fields fan out across every (side, wheel) cell selected
 * in the CMD section. Cmd-to-GS fields are silently dropped — they're
 * form-only by design (PRIMARY_COMMANDS_CMD_TO_GS_FIELDS on the client).
 */
function applyPrimary(state, payload) {
    for (const side of payload.sides) {
        const eIdx = entityIdxFor(side);
        for (const wheel of payload.wheels) {
            const cIdx = cmdIdxFor(wheel);
            const target = state.entities[eIdx].mCommands[cIdx].standardFields;
            for (const [key, value] of Object.entries(payload.fields)) {
                if (PRIMARY_CMD_TO_GS_KEYS.has(key)) {
                    continue;
                }
                if (!PRIMARY_STANDARD_KEY_SET.has(key)) {
                    continue;
                }
                target[key] = value;
            }
        }
    }
}
exports.applyPrimary = applyPrimary;
/**
 * Secondary apply: the payload mixes three field families that route to
 * different state slots:
 *   - additionalFields  → per (side, wheel) on mCommands
 *   - aCommands         → per side (TLL/TLR — wheel selection ignored)
 *   - GDL flat fields   → global, written to BOTH entities for symmetry
 *                          (matches the wire contract — grid reads [0])
 */
function applySecondary(state, payload) {
    const entries = Object.entries(payload.fields);
    // 1) 8-col additionalFields: per (side, wheel) cell.
    for (const side of payload.sides) {
        const eIdx = entityIdxFor(side);
        for (const wheel of payload.wheels) {
            const cIdx = cmdIdxFor(wheel);
            const target = state.entities[eIdx].mCommands[cIdx].additionalFields;
            for (const [key, value] of entries) {
                if (SECONDARY_ADDITIONAL_KEY_SET.has(key)) {
                    target[key] = value;
                }
            }
        }
    }
    // 2) TLL/TLR aCommands: per side, wheel-independent.
    for (const side of payload.sides) {
        const eIdx = entityIdxFor(side);
        const target = state.entities[eIdx].aCommands;
        for (const [key, value] of entries) {
            if (SECONDARY_ACOMMANDS_KEY_SET.has(key)) {
                target[key] = value;
            }
        }
    }
    // 3) GDL flat fields: global, mirrored to both entities.
    const left = state.entities[0];
    const right = state.entities[1];
    for (const [key, value] of entries) {
        if (!SECONDARY_GDL_KEY_SET.has(key)) {
            continue;
        }
        left[key] = value;
        right[key] = value;
    }
}
exports.applySecondary = applySecondary;
const VALID_SIDES = new Set(['left', 'right']);
const VALID_WHEELS = new Set(['1', '2', '3', '4']);
function validatePayload(body) {
    if (!body || typeof body !== 'object') {
        return { ok: false, error: 'Body must be an object' };
    }
    const b = body;
    const sides = b['sides'];
    const wheels = b['wheels'];
    const fields = b['fields'];
    if (!Array.isArray(sides) || sides.length === 0) {
        return { ok: false, error: 'sides must be a non-empty array' };
    }
    if (!sides.every((s) => typeof s === 'string' && VALID_SIDES.has(s))) {
        return { ok: false, error: `sides must be subset of ${[...VALID_SIDES].join(',')}` };
    }
    if (!Array.isArray(wheels) || wheels.length === 0) {
        return { ok: false, error: 'wheels must be a non-empty array' };
    }
    if (!wheels.every((w) => typeof w === 'string' && VALID_WHEELS.has(w))) {
        return { ok: false, error: `wheels must be subset of ${[...VALID_WHEELS].join(',')}` };
    }
    if (!fields || typeof fields !== 'object' || Array.isArray(fields)) {
        return { ok: false, error: 'fields must be an object' };
    }
    return {
        ok: true,
        payload: {
            sides: sides,
            wheels: wheels,
            fields: fields,
        },
    };
}
exports.validatePayload = validatePayload;
const VALID_TEST_MODES = new Set(['active', 'inactive']);
function validateTestModePayload(body) {
    if (!body || typeof body !== 'object') {
        return { ok: false, error: 'Body must be an object' };
    }
    const mode = body['mode'];
    if (typeof mode !== 'string' || !VALID_TEST_MODES.has(mode)) {
        return { ok: false, error: `mode must be one of ${[...VALID_TEST_MODES].join(',')}` };
    }
    return { ok: true, payload: { mode: mode } };
}
exports.validateTestModePayload = validateTestModePayload;
