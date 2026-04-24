"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerSystemExperimentsRoutes = void 0;
const ws_1 = require("ws");
const state_1 = require("./state");
const ROUTE_PREFIX = '/api/system-experiments';
const WS_PATH = `${ROUTE_PREFIX}/ws`;
/**
 * Wires the System Experiments feature endpoints onto an existing express app +
 * http server. Self-contained — does NOT touch the existing `/api/config`,
 * `/api/rare-config`, or the `/api/ws` WebSocketServer.
 *
 * Endpoints registered:
 *   POST {prefix}/primary     — apply Primary form payload
 *   POST {prefix}/secondary   — apply Secondary form payload
 *   GET  {prefix}/get         — current full state (seed for the front-end)
 *   WS   {prefix}/ws          — broadcasts the full state after every POST
 *
 * WebSocket co-existence: this function uses `noServer: true` and adds a
 * scoped `upgrade` listener that only claims our path. The existing WSS
 * (created with `path: '/api/ws'`) ignores non-matching upgrades, so both
 * WS endpoints share the same HTTP server safely.
 */
function registerSystemExperimentsRoutes(app, server) {
    const state = (0, state_1.buildInitialState)();
    const wss = new ws_1.WebSocketServer({ noServer: true });
    const clients = new Set();
    server.on('upgrade', (request, socket, head) => {
        var _a;
        let pathname;
        try {
            pathname = new URL((_a = request.url) !== null && _a !== void 0 ? _a : '', `http://${request.headers.host}`).pathname;
        }
        catch (_b) {
            return;
        }
        if (pathname !== WS_PATH) {
            return;
        }
        wss.handleUpgrade(request, socket, head, (ws) => {
            wss.emit('connection', ws, request);
        });
    });
    wss.on('connection', (ws) => {
        clients.add(ws);
        console.log(`[system-experiments WS] connected (total: ${clients.size})`);
        // Push current snapshot so a fresh subscriber doesn't have to wait
        // for the next POST. Front-end concats GET+WS so this is replay-safe.
        safeSend(ws, state);
        ws.on('close', () => {
            clients.delete(ws);
            console.log(`[system-experiments WS] disconnected (total: ${clients.size})`);
        });
        ws.on('error', (err) => {
            console.error('[system-experiments WS] error:', err.message);
            clients.delete(ws);
        });
    });
    function broadcast() {
        const payload = JSON.stringify(state);
        let delivered = 0;
        for (const ws of clients) {
            if (ws.readyState === ws_1.WebSocket.OPEN) {
                ws.send(payload);
                delivered++;
            }
        }
        console.log(`[system-experiments WS] broadcast → ${delivered} client(s)`);
    }
    app.post(`${ROUTE_PREFIX}/primary`, (req, res) => {
        const result = (0, state_1.validatePayload)(req.body);
        if (!result.ok) {
            res.status(400).json({ error: result.error });
            return;
        }
        (0, state_1.applyPrimary)(state, result.payload);
        console.log(`[system-experiments] POST /primary — sides=${result.payload.sides.join(',')}` +
            ` wheels=${result.payload.wheels.join(',')}` +
            ` fields=${Object.keys(result.payload.fields).length}`);
        broadcast();
        res.json({ status: 'accepted' });
    });
    app.post(`${ROUTE_PREFIX}/secondary`, (req, res) => {
        const result = (0, state_1.validatePayload)(req.body);
        if (!result.ok) {
            res.status(400).json({ error: result.error });
            return;
        }
        (0, state_1.applySecondary)(state, result.payload);
        console.log(`[system-experiments] POST /secondary — sides=${result.payload.sides.join(',')}` +
            ` wheels=${result.payload.wheels.join(',')}` +
            ` fields=${Object.keys(result.payload.fields).length}`);
        broadcast();
        res.json({ status: 'accepted' });
    });
    app.get(`${ROUTE_PREFIX}/get`, (_req, res) => {
        res.json(state);
    });
}
exports.registerSystemExperimentsRoutes = registerSystemExperimentsRoutes;
function safeSend(ws, payload) {
    if (ws.readyState === ws_1.WebSocket.OPEN) {
        ws.send(JSON.stringify(payload));
    }
}
