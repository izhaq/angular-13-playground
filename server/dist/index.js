"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const http_1 = __importDefault(require("http"));
const ws_1 = require("ws");
const path_1 = __importDefault(require("path"));
const simulation_engine_1 = require("./simulation-engine");
const routes_1 = require("./system-experiments/routes");
const PORT = Number(process.env['PORT'] || 3000);
const WS_UPDATE_DELAY_MS = Number(process.env['WS_UPDATE_DELAY_MS'] || 300);
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
const server = http_1.default.createServer(app);
// `noServer` mode (was: `{ server, path: '/api/ws' }`) so that multiple WS
// endpoints on the same HTTP server can coexist. A path-restricted WSS
// aborts non-matching upgrades with 400 (per the `ws` library), which
// would shoot down our system-experiments socket. The dispatcher below routes
// upgrades by path; behavior on `/api/ws` is identical to before.
const wss = new ws_1.WebSocketServer({ noServer: true });
server.on('upgrade', (request, socket, head) => {
    var _a;
    let pathname;
    try {
        pathname = new URL((_a = request.url) !== null && _a !== void 0 ? _a : '', `http://${request.headers.host}`).pathname;
    }
    catch (_b) {
        socket.destroy();
        return;
    }
    if (pathname === '/api/ws') {
        wss.handleUpgrade(request, socket, head, (ws) => wss.emit('connection', ws, request));
    }
    // Other paths (e.g. `/api/system-experiments/ws`) are handled by their own
    // upgrade listeners registered elsewhere — see `registerSystemExperimentsRoutes`.
});
const clients = new Set();
wss.on('connection', (ws) => {
    console.log(`[WS] Client connected (total: ${clients.size + 1})`);
    clients.add(ws);
    ws.on('close', () => {
        clients.delete(ws);
        console.log(`[WS] Client disconnected (total: ${clients.size})`);
    });
    ws.on('error', (err) => {
        console.error('[WS] Error:', err.message);
        clients.delete(ws);
    });
});
function broadcast(updates) {
    const aliveClients = Array.from(clients).filter((ws) => ws.readyState === ws_1.WebSocket.OPEN);
    aliveClients.forEach((ws, clientIdx) => {
        updates.forEach((update, i) => {
            const delay = WS_UPDATE_DELAY_MS * (i + 1);
            setTimeout(() => {
                if (ws.readyState === ws_1.WebSocket.OPEN) {
                    ws.send(JSON.stringify(update));
                }
            }, delay);
        });
    });
    console.log(`[WS] Broadcasting ${updates.length} updates to ${aliveClients.length} client(s) over ${updates.length * WS_UPDATE_DELAY_MS}ms`);
}
let lastSavedState = null;
app.post('/api/config', (req, res) => {
    const state = req.body;
    if (!state || !state.operations) {
        res.status(400).json({ error: 'Invalid payload: operations required' });
        return;
    }
    lastSavedState = state;
    const updates = (0, simulation_engine_1.processConfig)(state);
    console.log(`[API] POST /api/config — scenario: ${state.scenario}`);
    broadcast(updates);
    res.json({
        status: 'accepted',
        updatesScheduled: updates.length,
        scenario: state.scenario,
    });
});
app.get('/api/config', (_req, res) => {
    if (lastSavedState) {
        res.json(lastSavedState);
    }
    else {
        res.status(404).json({ error: 'No config saved yet' });
    }
});
let lastSavedRareState = null;
app.post('/api/rare-config', (req, res) => {
    const state = req.body;
    if (!state || !state.rareOperations) {
        res.status(400).json({ error: 'Invalid payload: rareOperations required' });
        return;
    }
    lastSavedRareState = state;
    const updates = (0, simulation_engine_1.processRareConfig)(state);
    console.log(`[API] POST /api/rare-config — scenario: ${state.scenario}`);
    broadcast(updates);
    res.json({
        status: 'accepted',
        updatesScheduled: updates.length,
        scenario: state.scenario,
    });
});
app.get('/api/rare-config', (_req, res) => {
    if (lastSavedRareState) {
        res.json(lastSavedRareState);
    }
    else {
        res.status(404).json({ error: 'No rare config saved yet' });
    }
});
// System Experiments feature endpoints (POST /primary, POST /secondary, GET /get,
// WS /api/system-experiments/ws). Self-contained — does not touch the routes above.
(0, routes_1.registerSystemExperimentsRoutes)(app, server);
app.get('/api/health', (_req, res) => {
    res.json({
        status: 'ok',
        uptime: process.uptime(),
        clients: clients.size,
    });
});
const distPath = path_1.default.resolve(__dirname, '../../dist/angular-13-playground');
app.use(express_1.default.static(distPath));
app.get('*', (_req, res) => {
    res.sendFile(path_1.default.join(distPath, 'index.html'));
});
server.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════════════════════╗
║   Driving Simulation Server                              ║
║──────────────────────────────────────────────────────────║
║   HTTP:  http://localhost:${PORT}                            ║
║   WS:    ws://localhost:${PORT}/api/ws                        ║
║   API:   POST /api/config                                ║
║   API:   GET  /api/config                                ║
║   API:   POST /api/rare-config                           ║
║   API:   GET  /api/rare-config                           ║
║   API:   POST /api/system-experiments/primary            ║
║   API:   POST /api/system-experiments/secondary          ║
║   API:   GET  /api/system-experiments/get                ║
║   API:   WS   /api/system-experiments/ws                 ║
║   API:   GET  /api/health                                ║
╚══════════════════════════════════════════════════════════╝
  `);
});
