import { BoardPostPayload, SystemExperimentsResponse, TestModePayload } from './models';
export declare function buildInitialState(): SystemExperimentsResponse;
/**
 * Wipes the live state back to bootstrap defaults in place. Mutates so
 * the WS broadcast sees the same object reference everyone else holds.
 */
export declare function resetState(state: SystemExperimentsResponse): void;
/**
 * Primary apply: fields fan out across every (side, wheel) cell selected
 * in the CMD section. Cmd-to-GS fields are silently dropped — they're
 * form-only by design (PRIMARY_COMMANDS_CMD_TO_GS_FIELDS on the client).
 */
export declare function applyPrimary(state: SystemExperimentsResponse, payload: BoardPostPayload): void;
/**
 * Secondary apply: the payload mixes three field families that route to
 * different state slots:
 *   - additionalFields  → per (side, wheel) on mCommands
 *   - aCommands         → per side (TLL/TLR — wheel selection ignored)
 *   - GDL flat fields   → global, written to BOTH entities for symmetry
 *                          (matches the wire contract — grid reads [0])
 */
export declare function applySecondary(state: SystemExperimentsResponse, payload: BoardPostPayload): void;
export declare function validatePayload(body: unknown): {
    ok: true;
    payload: BoardPostPayload;
} | {
    ok: false;
    error: string;
};
export declare function validateTestModePayload(body: unknown): {
    ok: true;
    payload: TestModePayload;
} | {
    ok: false;
    error: string;
};
