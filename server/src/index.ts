import express from 'express';
import cors from 'cors';
import http from 'http';
import { WebSocket, WebSocketServer } from 'ws';
import path from 'path';
import { DashboardState, FieldUpdate } from './models';
import { processConfig } from './simulation-engine';

const PORT = Number(process.env['PORT'] || 3000);
const WS_UPDATE_DELAY_MS = Number(process.env['WS_UPDATE_DELAY_MS'] || 300);

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);

const wss = new WebSocketServer({ server, path: '/api/ws' });

const clients = new Set<WebSocket>();

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

function broadcast(updates: FieldUpdate[]): void {
  const aliveClients = Array.from(clients).filter(
    (ws) => ws.readyState === WebSocket.OPEN
  );

  aliveClients.forEach((ws, clientIdx) => {
    updates.forEach((update, i) => {
      const delay = WS_UPDATE_DELAY_MS * (i + 1);
      setTimeout(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(update));
        }
      }, delay);
    });
  });

  console.log(
    `[WS] Broadcasting ${updates.length} updates to ${aliveClients.length} client(s) over ${updates.length * WS_UPDATE_DELAY_MS}ms`
  );
}

let lastSavedState: DashboardState | null = null;

app.post('/api/config', (req, res) => {
  const state: DashboardState = req.body;

  if (!state || !state.operations) {
    res.status(400).json({ error: 'Invalid payload: operations required' });
    return;
  }

  lastSavedState = state;
  const updates = processConfig(state);

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
  } else {
    res.status(404).json({ error: 'No config saved yet' });
  }
});

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    clients: clients.size,
  });
});

const distPath = path.resolve(__dirname, '../../dist/angular-13-playground');
app.use(express.static(distPath));
app.get('*', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

server.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════╗
║   Driving Simulation Server                      ║
║──────────────────────────────────────────────────║
║   HTTP:  http://localhost:${PORT}                    ║
║   WS:    ws://localhost:${PORT}/api/ws                ║
║   API:   POST /api/config                        ║
║   API:   GET  /api/config                        ║
║   API:   GET  /api/health                        ║
╚══════════════════════════════════════════════════╝
  `);
});
