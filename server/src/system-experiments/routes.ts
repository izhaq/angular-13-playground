import type { Express } from 'express';
import type { Server as HttpServer } from 'http';
import { WebSocket, WebSocketServer } from 'ws';

import { SystemExperimentsResponse } from './models';
import { applyPrimary, applySecondary, buildInitialState, validatePayload } from './state';

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
export function registerSystemExperimentsRoutes(app: Express, server: HttpServer): void {
  const state: SystemExperimentsResponse = buildInitialState();

  const wss = new WebSocketServer({ noServer: true });
  const clients = new Set<WebSocket>();

  server.on('upgrade', (request, socket, head) => {
    let pathname: string;
    try {
      pathname = new URL(request.url ?? '', `http://${request.headers.host}`).pathname;
    } catch {
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
    ws.on('error', (err: Error) => {
      console.error('[system-experiments WS] error:', err.message);
      clients.delete(ws);
    });
  });

  function broadcast(): void {
    const payload = JSON.stringify(state);
    let delivered = 0;
    for (const ws of clients) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(payload);
        delivered++;
      }
    }
    console.log(`[system-experiments WS] broadcast → ${delivered} client(s)`);
  }

  app.post(`${ROUTE_PREFIX}/primary`, (req, res) => {
    const result = validatePayload(req.body);
    if (!result.ok) {
      res.status(400).json({ error: result.error });
      return;
    }
    applyPrimary(state, result.payload);
    console.log(
      `[system-experiments] POST /primary — sides=${result.payload.sides.join(',')}` +
      ` wheels=${result.payload.wheels.join(',')}` +
      ` fields=${Object.keys(result.payload.fields).length}`,
    );
    broadcast();
    res.json({ status: 'accepted' });
  });

  app.post(`${ROUTE_PREFIX}/secondary`, (req, res) => {
    const result = validatePayload(req.body);
    if (!result.ok) {
      res.status(400).json({ error: result.error });
      return;
    }
    applySecondary(state, result.payload);
    console.log(
      `[system-experiments] POST /secondary — sides=${result.payload.sides.join(',')}` +
      ` wheels=${result.payload.wheels.join(',')}` +
      ` fields=${Object.keys(result.payload.fields).length}`,
    );
    broadcast();
    res.json({ status: 'accepted' });
  });

  app.get(`${ROUTE_PREFIX}/get`, (_req, res) => {
    res.json(state);
  });
}

function safeSend(ws: WebSocket, payload: unknown): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}
