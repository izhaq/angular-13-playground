/// <reference types="node" />
import type { Express } from 'express';
import type { Server as HttpServer } from 'http';
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
export declare function registerSystemExperimentsRoutes(app: Express, server: HttpServer): void;
